/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { coreMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { isExternalUiamCredential } from '@kbn/core-security-server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { MockedLogger } from '@kbn/logging-mocks';
import { ApiKeyType } from '../config';
import type { ConcreteTaskInstance, TaskInstance, TaskUserScope } from '../task';
import { TaskStatus } from '../task';
import { taskManagerUiamTelemetry } from '../otel/uiam_telemetry';
import { buildTaskFakeRequest } from '../task_running/fake_request_factory';
import type {
  ApiKeyInvalidationSource,
  ApiKeySOFields,
  ApiKeyStrategy,
  GrantApiKeysOpts,
  InvalidationTarget,
} from './api_key_strategy';
import { createApiKeyStrategy } from './create_api_key_strategy';
import { EsApiKeyStrategy } from './es_api_key_strategy';
import { EsAndUiamApiKeyStrategy } from './es_and_uiam_api_key_strategy';

// Golden tests pinning the API key behavior of Task Manager end to end (strategy ->
// @kbn/response-ops-scoped-api-keys -> security service).

const SPACE_ID = asSpaceId('space-a');
const REQUEST = '<request>';

const CREDENTIALS_TAGS = ['serverless', 'task-manager', 'uiam', 'uiam-api-key-invalid-credentials'];
const GRANT_TAGS = ['serverless', 'task-manager', 'uiam', 'uiam-api-key-grant'];
const USAGE_TAGS = ['serverless', 'task-manager', 'uiam', 'uiam-api-key-missing'];

const NOT_UIAM_COMPATIBLE_LOG = [
  'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
  { tags: CREDENTIALS_TAGS },
];
const CLOUD_KEY_NOT_SUPPORTED =
  'Cloud API keys are only supported in serverless environments; use a project-scoped Elasticsearch API key instead.';

const b64 = (value: string) => Buffer.from(value).toString('base64');

const TASKS: TaskInstance[] = [
  { id: 'task-1', taskType: 'report', params: {}, state: {} },
  { id: 'task-2', taskType: 'report', params: {}, state: {} },
  { id: 'task-3', taskType: 'alert', params: {}, state: {} },
];

const mockTaskInstance = (overrides: Partial<ConcreteTaskInstance> = {}): ConcreteTaskInstance => ({
  id: 'task-1',
  taskType: 'report',
  params: {},
  state: {},
  scheduledAt: new Date('2026-01-01T00:00:00.000Z'),
  attempts: 0,
  status: TaskStatus.Running,
  runAt: new Date('2026-01-01T00:00:00.000Z'),
  startedAt: new Date('2026-01-01T00:00:00.000Z'),
  retryAt: null,
  ownerId: null,
  ...overrides,
});

type StrategyKind = 'es' | 'es_and_uiam:es' | 'es_and_uiam:uiam';
const ALL_STRATEGIES: StrategyKind[] = ['es', 'es_and_uiam:es', 'es_and_uiam:uiam'];
const ES_AND_UIAM_STRATEGIES: StrategyKind[] = ['es_and_uiam:es', 'es_and_uiam:uiam'];

const createStrategy = (
  kind: StrategyKind,
  security: SecurityServiceStart,
  logger: MockedLogger
): ApiKeyStrategy =>
  createApiKeyStrategy(
    kind === 'es_and_uiam:uiam' ? ApiKeyType.UIAM : ApiKeyType.ES,
    kind !== 'es',
    security,
    logger
  );

type CredentialKind =
  | 'session'
  | 'uiam_session'
  | 'es_api_key'
  | 'uiam_encoded_api_key'
  | 'uiam_raw_api_key'
  | 'fake_es_api_key'
  | 'fake_uiam_api_key'
  | 'uiam_service_account';

const AUTHORIZATION: Record<CredentialKind, string> = {
  session: 'Basic dXNlcjpwYXNz',
  uiam_session: 'Bearer essu_session-token',
  es_api_key: `ApiKey ${b64('es-user-id:es-user-secret')}`,
  uiam_encoded_api_key: `ApiKey ${b64('uiam-user-id:essu_uiam-user-secret')}`,
  uiam_raw_api_key: 'ApiKey essu_raw-user-key',
  fake_es_api_key: `ApiKey ${b64('fake-es-id:fake-es-secret')}`,
  fake_uiam_api_key: 'ApiKey essu_fake-uiam-key',
  uiam_service_account: 'Bearer essu_sa-token',
};

const buildRequest = (credential: CredentialKind): KibanaRequest => {
  const headers = { authorization: AUTHORIZATION[credential] };
  if (credential === 'fake_es_api_key' || credential === 'fake_uiam_api_key') {
    return kibanaRequestFactory({ headers, spaceId: SPACE_ID });
  }
  return httpServerMock.createKibanaRequest({ headers, spaceId: SPACE_ID });
};

const buildUser = (
  credential: CredentialKind,
  apiKeyInternal?: boolean
): AuthenticatedUser | null => {
  const identity = { username: 'elastic', profile_uid: 'u_profile' };
  switch (credential) {
    case 'fake_es_api_key':
    case 'fake_uiam_api_key':
      return null;
    case 'session':
      return mockAuthenticatedUser(identity);
    case 'uiam_session':
    case 'uiam_service_account':
      return mockAuthenticatedUser({ ...identity, authentication_type: 'token' });
    default:
      return mockAuthenticatedUser({
        ...identity,
        authentication_type: 'api_key',
        api_key: {
          id: 'caller-key-id',
          name: 'caller-key',
          managed_by: 'elasticsearch',
          ...(apiKeyInternal === undefined ? {} : { internal: apiKeyInternal }),
        },
      });
  }
};

type GrantMockName = 'grantAsInternalUser' | 'cloneAsInternalUser' | 'uiam.grant';

interface FailureSpec {
  mock: GrantMockName;
  call: number;
  kind: 'null' | 'throw';
}

interface GrantScenario {
  strategy: StrategyKind;
  credential: CredentialKind;
  opts?: Omit<GrantApiKeysOpts, 'onApiKeyCreated'>;
  apiKeyInternal?: boolean;
  failure?: FailureSpec;
  apiKeysEnabled?: boolean;
  uiamAbsentAtGrant?: boolean;
}

interface RecordedMock {
  mock: { calls: unknown[][]; invocationCallOrder: number[] };
}

/** Flattens the calls of several mocks into one list, in invocation order. */
const callSequence = (request: KibanaRequest, mocks: Record<string, RecordedMock>) =>
  Object.entries(mocks)
    .flatMap(([name, { mock }]) =>
      mock.calls.map((args, index) => ({
        order: mock.invocationCallOrder[index],
        call: [name, ...args.map((arg) => (arg === request ? REQUEST : arg))],
      }))
    )
    .sort((a, b) => a.order - b.order)
    .map(({ call }) => call);

const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

const collectLogs = (logger: MockedLogger) =>
  Object.fromEntries(
    LOG_LEVELS.filter((level) => logger[level].mock.calls.length > 0).map((level) => [
      level,
      logger[level].mock.calls,
    ])
  );

const getUiam = (security: SecurityServiceStart) => {
  const { uiam } = security.authc.apiKeys;
  if (!uiam) {
    throw new Error('Expected the UIAM API keys mock to be present');
  }
  return uiam;
};

const mockSecurity = (security: SecurityServiceStart, scenario: GrantScenario) => {
  const { credential, apiKeyInternal, failure, apiKeysEnabled = true } = scenario;
  const { authc } = security;
  const { apiKeys } = authc;
  const uiam = getUiam(security);
  const failureFor = (mock: GrantMockName, call: number) =>
    failure?.mock === mock && failure.call === call ? failure.kind : undefined;
  const counts: Record<GrantMockName, number> = {
    grantAsInternalUser: 0,
    cloneAsInternalUser: 0,
    'uiam.grant': 0,
  };

  jest.mocked(authc.getCurrentUser).mockReturnValue(buildUser(credential, apiKeyInternal));
  jest
    .mocked(authc.getPrincipal)
    .mockReturnValue(
      credential === 'uiam_service_account'
        ? { type: 'service_account', serviceAccountId: 'sa-id', variant: 'uiam' }
        : null
    );
  jest.mocked(apiKeys.areAPIKeysEnabled).mockResolvedValue(apiKeysEnabled);
  jest.mocked(apiKeys.grantAsInternalUser).mockImplementation(async (_request, { name }) => {
    const call = ++counts.grantAsInternalUser;
    const injected = failureFor('grantAsInternalUser', call);
    if (injected === 'throw') throw new Error('grantAsInternalUser boom');
    if (injected === 'null') return null;
    return { id: `es-granted-${call}`, name, api_key: `es-granted-secret-${call}` };
  });
  jest.mocked(apiKeys.cloneAsInternalUser).mockImplementation(async (_request, { name }) => {
    const call = ++counts.cloneAsInternalUser;
    const injected = failureFor('cloneAsInternalUser', call);
    if (injected === 'throw') throw new Error('cloneAsInternalUser boom');
    if (injected === 'null') return null;
    return {
      id: `es-cloned-${call}`,
      name,
      api_key: `es-cloned-secret-${call}`,
      encoded: b64(`es-cloned-${call}:es-cloned-secret-${call}`),
    };
  });
  jest.mocked(uiam.grant).mockImplementation(async (_request, { name }) => {
    const call = ++counts['uiam.grant'];
    const injected = failureFor('uiam.grant', call);
    if (injected === 'throw') throw new Error('uiam.grant boom');
    if (injected === 'null') return null;
    return { id: `uiam-granted-${call}`, name, api_key: `essu_uiam-granted-secret-${call}` };
  });

  return uiam;
};

const runGrant = async (scenario: GrantScenario) => {
  const { security } = coreMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const strategy = createStrategy(scenario.strategy, security, logger);
  const uiam = mockSecurity(security, scenario);
  const request = buildRequest(scenario.credential);
  const onApiKeyCreated = jest.fn();

  if (scenario.uiamAbsentAtGrant) {
    security.authc.apiKeys.uiam = null;
  }

  let result: Map<string, ApiKeySOFields> | undefined;
  let error: string | undefined;
  try {
    result = await strategy.grantApiKeys(TASKS, request, security, {
      ...scenario.opts,
      onApiKeyCreated,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const { apiKeys } = security.authc;
  const calls = callSequence(request, {
    areAPIKeysEnabled: jest.mocked(apiKeys.areAPIKeysEnabled),
    grantAsInternalUser: jest.mocked(apiKeys.grantAsInternalUser),
    cloneAsInternalUser: jest.mocked(apiKeys.cloneAsInternalUser),
    'uiam.grant': jest.mocked(uiam.grant),
    onApiKeyCreated,
  });

  return { strategy, security, logger, request, result, error, calls };
};

const API_KEYS_ENABLED_CALL = ['areAPIKeysEnabled'];

const esGrantCall = (taskType: string, options: { refresh?: boolean } = {}) => [
  'grantAsInternalUser',
  REQUEST,
  { name: `TaskManager: ${taskType} - elastic`, role_descriptors: {}, metadata: { managed: true } },
  options,
];

const esCloneCall = (taskType: string, { withUser = true, refresh = true } = {}) => [
  'cloneAsInternalUser',
  REQUEST,
  {
    name: `TaskManager: ${taskType}${withUser ? ' - elastic' : ''}`,
    metadata: { managed: true },
    ...(refresh ? {} : { refresh: false }),
  },
];

const uiamName = (taskType: string, withUser = true) =>
  `TaskManager-UIAM: ${taskType}${withUser ? ' - elastic' : ''}`;

const uiamGrantCall = (taskType: string, withUser = true) => [
  'uiam.grant',
  REQUEST,
  { name: uiamName(taskType, withUser) },
];

const created = (apiKeyId: string, uiamApiKey?: string) => [
  'onApiKeyCreated',
  uiamApiKey ? { apiKeyId, uiamApiKey } : { apiKeyId },
];

const uiamCreated = (call: number) =>
  created(`uiam-granted-${call}`, `essu_uiam-granted-secret-${call}`);

const esGrantCalls = (options: { refresh?: boolean } = {}) => [
  esGrantCall('report', options),
  created('es-granted-1'),
  esGrantCall('alert', options),
  created('es-granted-2'),
];

const esGrantSequence = (options: { refresh?: boolean } = {}) => [
  API_KEYS_ENABLED_CALL,
  ...esGrantCalls(options),
];

const esCloneSequence = (cloneOptions: { withUser?: boolean; refresh?: boolean } = {}) => [
  API_KEYS_ENABLED_CALL,
  esCloneCall('report', cloneOptions),
  created('es-cloned-1'),
  esCloneCall('alert', cloneOptions),
  created('es-cloned-2'),
];

const uiamGrantCalls = (withUser = true) => [
  uiamGrantCall('report', withUser),
  uiamCreated(1),
  uiamGrantCall('alert', withUser),
  uiamCreated(2),
];

const uiamGrantSequence = (withUser = true) => [API_KEYS_ENABLED_CALL, ...uiamGrantCalls(withUser)];

const uiamNotEnabled = (withUser = true) =>
  `Failed to create UIAM API key "${uiamName('report', withUser)}": UIAM is not enabled`;

const cloudKeyFailed = (taskType: string) =>
  `Failed to create a Cloud API key "${uiamName(taskType)}"`;

const uiamGrantErrorLog = (taskType: string, message: string) => [
  `Failed to create UIAM API key "${uiamName(taskType)}": ${message}`,
  { tags: GRANT_TAGS, error: { stack_trace: expect.any(String) } },
];

const NULL_USER = { userProfileId: undefined, userName: undefined };

const scope = (apiKeyId: string, overrides: Partial<TaskUserScope> = {}): TaskUserScope => ({
  apiKeyId,
  spaceId: SPACE_ID,
  apiKeyCreatedByUser: false,
  userProfileId: 'u_profile',
  userName: 'elastic',
  ...overrides,
});

const esGranted = (call: number, overrides?: Partial<TaskUserScope>): ApiKeySOFields => ({
  apiKey: b64(`es-granted-${call}:es-granted-secret-${call}`),
  userScope: scope(`es-granted-${call}`, overrides),
});

const esCloned = (call: number, overrides?: Partial<TaskUserScope>): ApiKeySOFields => ({
  apiKey: b64(`es-cloned-${call}:es-cloned-secret-${call}`),
  userScope: scope(`es-cloned-${call}`, overrides),
});

const withUiamGranted = (fields: ApiKeySOFields, call: number): ApiKeySOFields => ({
  ...fields,
  uiamApiKey: `essu_uiam-granted-secret-${call}`,
  userScope: { ...fields.userScope, uiamApiKeyId: `uiam-granted-${call}` },
});

const uiamOnlyGranted = (call: number, overrides?: Partial<TaskUserScope>): ApiKeySOFields => ({
  uiamApiKey: `essu_uiam-granted-secret-${call}`,
  userScope: scope(`uiam-granted-${call}`, { uiamApiKeyId: `uiam-granted-${call}`, ...overrides }),
});

/** task-1 and task-2 share the `report` task type, task-3 is `alert`. */
const byTask = (
  report: ApiKeySOFields,
  alert: ApiKeySOFields = report
): Record<string, ApiKeySOFields> => ({ 'task-1': report, 'task-2': report, 'task-3': alert });

const CALLER_ES_KEY: ApiKeySOFields = {
  apiKey: b64('es-user-id:es-user-secret'),
  userScope: scope('es-user-id', { apiKeyCreatedByUser: true }),
};

const CALLER_UIAM_ENCODED_KEY: ApiKeySOFields = {
  uiamApiKey: 'essu_uiam-user-secret',
  userScope: scope('uiam-user-id', { uiamApiKeyId: 'uiam-user-id', apiKeyCreatedByUser: true }),
};

const CALLER_UIAM_RAW_KEY: ApiKeySOFields = {
  uiamApiKey: 'essu_raw-user-key',
  userScope: scope('', { apiKeyCreatedByUser: true }),
};

const withExternal = (fields: ApiKeySOFields): ApiKeySOFields => ({
  ...fields,
  userScope: { ...fields.userScope, uiamApiKeyExternal: true },
});

const ES_GRANTED_INVALIDATION = [{ apiKeyId: 'es-granted-1' }];
const ES_CLONED_INVALIDATION = [{ apiKeyId: 'es-cloned-1' }];
const UIAM_GRANTED_INVALIDATION = [
  { apiKeyId: 'uiam-granted-1', uiamApiKey: 'essu_uiam-granted-secret-1' },
];

interface GrantExpectation {
  error?: string;
  result?: Record<string, ApiKeySOFields>;
  /** Invalidation targets the same strategy derives from the granted `task-1` fields. */
  invalidation?: InvalidationTarget[];
  calls: unknown[][];
  logs?: Partial<Record<(typeof LOG_LEVELS)[number], unknown[][]>>;
}

interface GrantRow {
  title: string;
  scenario: GrantScenario;
  expected: GrantExpectation;
}

const describeScenario = ({
  strategy,
  credential,
  opts,
  apiKeyInternal,
  failure,
  apiKeysEnabled,
  uiamAbsentAtGrant,
}: GrantScenario) =>
  [
    strategy,
    credential,
    `opts=${JSON.stringify(opts ?? {})}`,
    apiKeyInternal !== undefined && `api_key.internal=${apiKeyInternal}`,
    failure &&
      `${failure.mock} call ${failure.call} ${failure.kind === 'null' ? 'returns null' : 'throws'}`,
    apiKeysEnabled === false && 'API keys disabled',
    uiamAbsentAtGrant && 'uiam service absent at grant time',
  ]
    .filter(Boolean)
    .join(' | ');

const row = (scenario: GrantScenario, expected: GrantExpectation): GrantRow => ({
  title: describeScenario(scenario),
  scenario,
  expected,
});

const isEsAndUiam = (strategy: StrategyKind) => strategy !== 'es';

const GRANT_ROWS: GrantRow[] = [
  // Session (Basic) credential: always grants one ES key per task type.
  ...ALL_STRATEGIES.flatMap((strategy) =>
    [{}, { cloneApiKey: true }, { onEsKey: true }, { refreshApiKey: true }].map((opts) =>
      row(
        { strategy, credential: 'session', opts },
        {
          result: byTask(esGranted(1), esGranted(2)),
          invalidation: ES_GRANTED_INVALIDATION,
          calls: esGrantSequence(),
          ...(isEsAndUiam(strategy) && !('onEsKey' in opts)
            ? { logs: { debug: [NOT_UIAM_COMPATIBLE_LOG] } }
            : {}),
        }
      )
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      { strategy, credential: 'session', opts: { refreshApiKey: false } },
      {
        result: byTask(esGranted(1), esGranted(2)),
        invalidation: ES_GRANTED_INVALIDATION,
        calls: esGrantSequence({ refresh: false }),
        ...(isEsAndUiam(strategy) ? { logs: { debug: [NOT_UIAM_COMPATIBLE_LOG] } } : {}),
      }
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      { strategy, credential: 'session', apiKeysEnabled: false },
      { error: 'API keys are not enabled, cannot create API key.', calls: [API_KEYS_ENABLED_CALL] }
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      {
        strategy,
        credential: 'session',
        failure: { mock: 'grantAsInternalUser', call: 1, kind: 'null' },
      },
      {
        error: 'Could not create API key.',
        calls: [API_KEYS_ENABLED_CALL, esGrantCall('report')],
        ...(isEsAndUiam(strategy) ? { logs: { debug: [NOT_UIAM_COMPATIBLE_LOG] } } : {}),
      }
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      {
        strategy,
        credential: 'session',
        failure: { mock: 'grantAsInternalUser', call: 2, kind: 'throw' },
      },
      {
        error: 'grantAsInternalUser boom',
        calls: [
          API_KEYS_ENABLED_CALL,
          esGrantCall('report'),
          created('es-granted-1'),
          esGrantCall('alert'),
        ],
        ...(isEsAndUiam(strategy) ? { logs: { debug: [NOT_UIAM_COMPATIBLE_LOG] } } : {}),
      }
    )
  ),

  // UIAM session (Bearer essu_): one UIAM key per task type first, then the ES keys.
  row(
    { strategy: 'es', credential: 'uiam_session' },
    {
      result: byTask(esGranted(1), esGranted(2)),
      invalidation: ES_GRANTED_INVALIDATION,
      calls: esGrantSequence(),
    }
  ),
  ...ES_AND_UIAM_STRATEGIES.flatMap((strategy) =>
    [{}, { cloneApiKey: true }, { refreshApiKey: false }].map((opts) =>
      row(
        { strategy, credential: 'uiam_session', opts },
        {
          result: byTask(withUiamGranted(esGranted(1), 1), withUiamGranted(esGranted(2), 2)),
          invalidation: [
            { apiKeyId: 'es-granted-1' },
            { apiKeyId: 'uiam-granted-1', uiamApiKey: 'essu_uiam-granted-secret-1' },
          ],
          calls: [
            API_KEYS_ENABLED_CALL,
            ...uiamGrantCalls(),
            ...esGrantCalls('refreshApiKey' in opts ? { refresh: false } : {}),
          ],
        }
      )
    )
  ),
  ...ES_AND_UIAM_STRATEGIES.map((strategy) =>
    row(
      { strategy, credential: 'uiam_session', opts: { onEsKey: true } },
      {
        result: byTask(esGranted(1), esGranted(2)),
        invalidation: ES_GRANTED_INVALIDATION,
        calls: esGrantSequence(),
      }
    )
  ),
  ...(['null', 'throw'] as const).map((kind) =>
    row(
      {
        strategy: 'es_and_uiam:es',
        credential: 'uiam_session',
        failure: { mock: 'uiam.grant', call: 1, kind },
      },
      {
        result: byTask(esGranted(1), withUiamGranted(esGranted(2), 2)),
        invalidation: ES_GRANTED_INVALIDATION,
        calls: [
          API_KEYS_ENABLED_CALL,
          uiamGrantCall('report'),
          uiamGrantCall('alert'),
          uiamCreated(2),
          ...esGrantCalls(),
        ],
        logs: {
          error: [
            uiamGrantErrorLog(
              'report',
              kind === 'null' ? cloudKeyFailed('report') : 'uiam.grant boom'
            ),
          ],
        },
      }
    )
  ),
  row(
    {
      strategy: 'es_and_uiam:uiam',
      credential: 'uiam_session',
      failure: { mock: 'uiam.grant', call: 1, kind: 'null' },
    },
    {
      error: cloudKeyFailed('report'),
      calls: [API_KEYS_ENABLED_CALL, uiamGrantCall('report')],
      logs: { error: [uiamGrantErrorLog('report', cloudKeyFailed('report'))] },
    }
  ),
  row(
    {
      strategy: 'es_and_uiam:uiam',
      credential: 'uiam_session',
      failure: { mock: 'uiam.grant', call: 2, kind: 'throw' },
    },
    {
      error: 'uiam.grant boom',
      calls: [
        API_KEYS_ENABLED_CALL,
        uiamGrantCall('report'),
        uiamCreated(1),
        uiamGrantCall('alert'),
      ],
      logs: { error: [uiamGrantErrorLog('alert', 'uiam.grant boom')] },
    }
  ),
  row(
    { strategy: 'es_and_uiam:es', credential: 'uiam_session', uiamAbsentAtGrant: true },
    {
      result: byTask(esGranted(1), esGranted(2)),
      invalidation: ES_GRANTED_INVALIDATION,
      calls: esGrantSequence(),
    }
  ),
  row(
    { strategy: 'es_and_uiam:uiam', credential: 'uiam_session', uiamAbsentAtGrant: true },
    { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
  ),

  // ES API key `base64(id:secret)`: reused as-is unless cloned.
  ...ALL_STRATEGIES.flatMap((strategy) =>
    [{}, { onEsKey: true }, { refreshApiKey: false }].map((opts) =>
      row(
        { strategy, credential: 'es_api_key', opts },
        { result: byTask(CALLER_ES_KEY), invalidation: [], calls: [API_KEYS_ENABLED_CALL] }
      )
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      { strategy, credential: 'es_api_key', apiKeyInternal: false },
      { result: byTask(CALLER_ES_KEY), invalidation: [], calls: [API_KEYS_ENABLED_CALL] }
    )
  ),
  ...ALL_STRATEGIES.flatMap((strategy) =>
    [{ cloneApiKey: true }, { cloneApiKey: true, refreshApiKey: false }].map((opts) =>
      row(
        { strategy, credential: 'es_api_key', opts },
        {
          result: byTask(esCloned(1), esCloned(2)),
          invalidation: ES_CLONED_INVALIDATION,
          calls: esCloneSequence({ refresh: !('refreshApiKey' in opts) }),
        }
      )
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      {
        strategy,
        credential: 'es_api_key',
        opts: { cloneApiKey: true },
        failure: { mock: 'cloneAsInternalUser', call: 1, kind: 'null' },
      },
      { error: 'Could not create API key.', calls: [API_KEYS_ENABLED_CALL, esCloneCall('report')] }
    )
  ),
  ...ALL_STRATEGIES.map((strategy) =>
    row(
      {
        strategy,
        credential: 'es_api_key',
        opts: { cloneApiKey: true },
        failure: { mock: 'cloneAsInternalUser', call: 2, kind: 'throw' },
      },
      {
        error: 'cloneAsInternalUser boom',
        calls: [
          API_KEYS_ENABLED_CALL,
          esCloneCall('report'),
          created('es-cloned-1'),
          esCloneCall('alert'),
        ],
      }
    )
  ),

  // UIAM key encoded as `base64(id:essu_...)`: a UIAM key, never stored as an ES key.
  ...[{}, { onEsKey: true }].map((opts) =>
    row(
      { strategy: 'es', credential: 'uiam_encoded_api_key', opts },
      { error: CLOUD_KEY_NOT_SUPPORTED, calls: [API_KEYS_ENABLED_CALL] }
    )
  ),
  row(
    { strategy: 'es', credential: 'uiam_encoded_api_key', opts: { cloneApiKey: true } },
    { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
  ),
  ...ES_AND_UIAM_STRATEGIES.flatMap((strategy) => [
    row(
      { strategy, credential: 'uiam_encoded_api_key' },
      { result: byTask(CALLER_UIAM_ENCODED_KEY), invalidation: [], calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_encoded_api_key', apiKeyInternal: false },
      {
        result: byTask(withExternal(CALLER_UIAM_ENCODED_KEY)),
        invalidation: [],
        calls: [API_KEYS_ENABLED_CALL],
      }
    ),
    row(
      { strategy, credential: 'uiam_encoded_api_key', opts: { onEsKey: true } },
      { error: CLOUD_KEY_NOT_SUPPORTED, calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_encoded_api_key', opts: { cloneApiKey: true } },
      {
        result: byTask(uiamOnlyGranted(1), uiamOnlyGranted(2)),
        invalidation: UIAM_GRANTED_INVALIDATION,
        calls: uiamGrantSequence(),
      }
    ),
  ]),

  // Raw user-created Cloud key `essu_...`.
  ...[{}, { onEsKey: true }].map((opts) =>
    row(
      { strategy: 'es', credential: 'uiam_raw_api_key', opts },
      { error: CLOUD_KEY_NOT_SUPPORTED, calls: [API_KEYS_ENABLED_CALL] }
    )
  ),
  row(
    { strategy: 'es', credential: 'uiam_raw_api_key', opts: { cloneApiKey: true } },
    { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
  ),
  ...ES_AND_UIAM_STRATEGIES.flatMap((strategy) => [
    row(
      { strategy, credential: 'uiam_raw_api_key' },
      { result: byTask(CALLER_UIAM_RAW_KEY), invalidation: [], calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_raw_api_key', apiKeyInternal: false },
      {
        result: byTask(withExternal(CALLER_UIAM_RAW_KEY)),
        invalidation: [],
        calls: [API_KEYS_ENABLED_CALL],
      }
    ),
    row(
      { strategy, credential: 'uiam_raw_api_key', apiKeyInternal: true },
      { result: byTask(CALLER_UIAM_RAW_KEY), invalidation: [], calls: [API_KEYS_ENABLED_CALL] }
    ),
    ...[
      { opts: { cloneApiKey: true } },
      { opts: { cloneApiKey: true }, apiKeyInternal: false },
      { opts: { cloneApiKey: true, refreshApiKey: false } },
    ].map((variant) =>
      row(
        { strategy, credential: 'uiam_raw_api_key', ...variant },
        {
          result: byTask(uiamOnlyGranted(1), uiamOnlyGranted(2)),
          invalidation: UIAM_GRANTED_INVALIDATION,
          calls: uiamGrantSequence(),
        }
      )
    ),
    row(
      {
        strategy,
        credential: 'uiam_raw_api_key',
        opts: { cloneApiKey: true },
        uiamAbsentAtGrant: true,
      },
      { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_raw_api_key', opts: { onEsKey: true } },
      { error: CLOUD_KEY_NOT_SUPPORTED, calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_raw_api_key', opts: { onEsKey: true, cloneApiKey: true } },
      { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
    ),
    ...(['null', 'throw'] as const).map((kind) =>
      row(
        {
          strategy,
          credential: 'uiam_raw_api_key',
          opts: { cloneApiKey: true },
          failure: { mock: 'uiam.grant', call: 1, kind },
        },
        {
          error: kind === 'null' ? cloudKeyFailed('report') : 'uiam.grant boom',
          calls: [API_KEYS_ENABLED_CALL, uiamGrantCall('report')],
          logs: {
            error: [
              uiamGrantErrorLog(
                'report',
                kind === 'null' ? cloudKeyFailed('report') : 'uiam.grant boom'
              ),
            ],
          },
        }
      )
    ),
    row(
      {
        strategy,
        credential: 'uiam_raw_api_key',
        opts: { cloneApiKey: true },
        failure: { mock: 'uiam.grant', call: 2, kind: 'throw' },
      },
      {
        error: 'uiam.grant boom',
        calls: [
          API_KEYS_ENABLED_CALL,
          uiamGrantCall('report'),
          uiamCreated(1),
          uiamGrantCall('alert'),
        ],
        logs: { error: [uiamGrantErrorLog('alert', 'uiam.grant boom')] },
      }
    ),
  ]),

  // Fake request carrying an ES API key (no resolved user): always cloned.
  ...ALL_STRATEGIES.flatMap((strategy) =>
    [{}, { cloneApiKey: true }, { onEsKey: true }, { refreshApiKey: false }].map((opts) =>
      row(
        { strategy, credential: 'fake_es_api_key', opts },
        {
          result: byTask(esCloned(1, NULL_USER), esCloned(2, NULL_USER)),
          invalidation: ES_CLONED_INVALIDATION,
          calls: esCloneSequence({ withUser: false, refresh: !('refreshApiKey' in opts) }),
        }
      )
    )
  ),

  // Fake request carrying a UIAM credential (no resolved user): a fresh UIAM key.
  row(
    { strategy: 'es', credential: 'fake_uiam_api_key' },
    { error: uiamNotEnabled(false), calls: [API_KEYS_ENABLED_CALL] }
  ),
  ...ES_AND_UIAM_STRATEGIES.flatMap((strategy) => [
    ...[{}, { cloneApiKey: true }].map((opts) =>
      row(
        { strategy, credential: 'fake_uiam_api_key', opts },
        {
          result: byTask(uiamOnlyGranted(1, NULL_USER), uiamOnlyGranted(2, NULL_USER)),
          invalidation: UIAM_GRANTED_INVALIDATION,
          calls: uiamGrantSequence(false),
        }
      )
    ),
    row(
      { strategy, credential: 'fake_uiam_api_key', opts: { onEsKey: true } },
      { error: uiamNotEnabled(false), calls: [API_KEYS_ENABLED_CALL] }
    ),
  ]),

  // UIAM service account principal: ES cannot grant for it, so its UIAM key is its only one.
  ...[{}, { onEsKey: true }].map((opts) =>
    row(
      { strategy: 'es', credential: 'uiam_service_account', opts },
      { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
    )
  ),
  ...ES_AND_UIAM_STRATEGIES.flatMap((strategy) => [
    ...[{}, { cloneApiKey: true }].map((opts) =>
      row(
        { strategy, credential: 'uiam_service_account', opts },
        {
          result: byTask(uiamOnlyGranted(1), uiamOnlyGranted(2)),
          invalidation: UIAM_GRANTED_INVALIDATION,
          calls: uiamGrantSequence(),
        }
      )
    ),
    row(
      { strategy, credential: 'uiam_service_account', opts: { onEsKey: true } },
      { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      { strategy, credential: 'uiam_service_account', uiamAbsentAtGrant: true },
      { error: uiamNotEnabled(), calls: [API_KEYS_ENABLED_CALL] }
    ),
    row(
      {
        strategy,
        credential: 'uiam_service_account',
        failure: { mock: 'uiam.grant', call: 1, kind: 'null' },
      },
      {
        error: cloudKeyFailed('report'),
        calls: [API_KEYS_ENABLED_CALL, uiamGrantCall('report')],
        logs: { error: [uiamGrantErrorLog('report', cloudKeyFailed('report'))] },
      }
    ),
    row(
      {
        strategy,
        credential: 'uiam_service_account',
        failure: { mock: 'uiam.grant', call: 2, kind: 'throw' },
      },
      {
        error: 'uiam.grant boom',
        calls: [
          API_KEYS_ENABLED_CALL,
          uiamGrantCall('report'),
          uiamCreated(1),
          uiamGrantCall('alert'),
        ],
        logs: { error: [uiamGrantErrorLog('alert', 'uiam.grant boom')] },
      }
    ),
  ]),
];

describe('API key strategy characterization', () => {
  let recordTaskRunSpy: jest.SpyInstance;
  let recordUiamApiKeyFallbackSpy: jest.SpyInstance;

  beforeEach(() => {
    recordTaskRunSpy = jest
      .spyOn(taskManagerUiamTelemetry, 'recordTaskRun')
      .mockImplementation(() => {});
    recordUiamApiKeyFallbackSpy = jest
      .spyOn(taskManagerUiamTelemetry, 'recordUiamApiKeyFallback')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createApiKeyStrategy', () => {
    const ES_STRATEGY = { esAndUiam: false, shouldGrantUiam: false, typeToUse: ApiKeyType.ES };
    const CASES: Array<{
      apiKeyType: ApiKeyType;
      grantUiamApiKeys: boolean;
      uiamPresent: boolean;
      expected: { esAndUiam: boolean; shouldGrantUiam: boolean; typeToUse: ApiKeyType };
    }> = [
      {
        apiKeyType: ApiKeyType.ES,
        grantUiamApiKeys: false,
        uiamPresent: true,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.UIAM,
        grantUiamApiKeys: false,
        uiamPresent: true,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.ES,
        grantUiamApiKeys: false,
        uiamPresent: false,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.UIAM,
        grantUiamApiKeys: false,
        uiamPresent: false,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.ES,
        grantUiamApiKeys: true,
        uiamPresent: false,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.UIAM,
        grantUiamApiKeys: true,
        uiamPresent: false,
        expected: ES_STRATEGY,
      },
      {
        apiKeyType: ApiKeyType.ES,
        grantUiamApiKeys: true,
        uiamPresent: true,
        expected: { esAndUiam: true, shouldGrantUiam: true, typeToUse: ApiKeyType.ES },
      },
      {
        apiKeyType: ApiKeyType.UIAM,
        grantUiamApiKeys: true,
        uiamPresent: true,
        expected: { esAndUiam: true, shouldGrantUiam: true, typeToUse: ApiKeyType.UIAM },
      },
    ];

    it.each(CASES)(
      'apiKeyType=$apiKeyType, grantUiamApiKeys=$grantUiamApiKeys, uiam service present=$uiamPresent',
      ({ apiKeyType, grantUiamApiKeys, uiamPresent, expected }) => {
        const { security } = coreMock.createStart();
        if (!uiamPresent) {
          security.authc.apiKeys.uiam = null;
        }
        const strategy = createApiKeyStrategy(
          apiKeyType,
          grantUiamApiKeys,
          security,
          loggingSystemMock.createLogger()
        );

        expect(strategy).toBeInstanceOf(
          expected.esAndUiam ? EsAndUiamApiKeyStrategy : EsApiKeyStrategy
        );
        expect({
          esAndUiam: strategy instanceof EsAndUiamApiKeyStrategy,
          shouldGrantUiam: strategy.shouldGrantUiam,
          typeToUse: strategy.typeToUse,
        }).toStrictEqual(expected);
      }
    );
  });

  describe('grantApiKeys (tasks: report, report, alert)', () => {
    it('has unique row titles', () => {
      const titles = GRANT_ROWS.map(({ title }) => title);
      expect(new Set(titles).size).toBe(titles.length);
    });

    it.each(GRANT_ROWS)('$title', async ({ scenario, expected }) => {
      const { strategy, result, error, calls, logger } = await runGrant(scenario);
      const logs = collectLogs(logger);
      const taskOneFields = result?.get('task-1');

      expect({
        ...(error !== undefined ? { error } : {}),
        ...(result ? { result: [...result.entries()] } : {}),
        ...(taskOneFields
          ? { invalidation: strategy.getApiKeyIdsForInvalidation(taskOneFields) }
          : {}),
        calls,
        ...(Object.keys(logs).length > 0 ? { logs } : {}),
      }).toStrictEqual({
        ...(expected.error !== undefined ? { error: expected.error } : {}),
        ...(expected.result ? { result: Object.entries(expected.result) } : {}),
        ...(expected.invalidation ? { invalidation: expected.invalidation } : {}),
        calls: expected.calls,
        ...(expected.logs ? { logs: expected.logs } : {}),
      });
      expect(recordTaskRunSpy).not.toHaveBeenCalled();
      expect(recordUiamApiKeyFallbackSpy).not.toHaveBeenCalled();
    });

    it.each(ALL_STRATEGIES)('%s | grants without any opts', async (strategy) => {
      const { security } = coreMock.createStart();
      mockSecurity(security, { strategy, credential: 'session' });
      const result = await createStrategy(
        strategy,
        security,
        loggingSystemMock.createLogger()
      ).grantApiKeys(TASKS, buildRequest('session'), security);

      expect([...result.entries()]).toStrictEqual(
        Object.entries(byTask(esGranted(1), esGranted(2)))
      );
    });

    it('es_and_uiam | persists a raw user-created key without any opts', async () => {
      const { security } = coreMock.createStart();
      mockSecurity(security, { strategy: 'es_and_uiam:uiam', credential: 'uiam_raw_api_key' });
      const result = await createStrategy(
        'es_and_uiam:uiam',
        security,
        loggingSystemMock.createLogger()
      ).grantApiKeys(TASKS, buildRequest('uiam_raw_api_key'), security);

      expect([...result.entries()]).toStrictEqual(Object.entries(byTask(CALLER_UIAM_RAW_KEY)));
    });

    it('returns an empty map for an empty task list', async () => {
      const { security } = coreMock.createStart();
      mockSecurity(security, { strategy: 'es_and_uiam:uiam', credential: 'uiam_session' });
      const result = await createStrategy(
        'es_and_uiam:uiam',
        security,
        loggingSystemMock.createLogger()
      ).grantApiKeys([], buildRequest('uiam_session'), security);

      expect([...result.entries()]).toStrictEqual([]);
      expect(jest.mocked(security.authc.apiKeys.areAPIKeysEnabled)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(security.authc.apiKeys.grantAsInternalUser)).not.toHaveBeenCalled();
      expect(jest.mocked(getUiam(security).grant)).not.toHaveBeenCalled();
    });

    it.each(ALL_STRATEGIES)('%s | truncates key names to 256 characters', async (strategy) => {
      const { security } = coreMock.createStart();
      const uiam = mockSecurity(security, { strategy, credential: 'uiam_session' });
      const taskType = 'x'.repeat(300);
      await createStrategy(strategy, security, loggingSystemMock.createLogger()).grantApiKeys(
        [{ id: 'task-1', taskType, params: {}, state: {} }],
        buildRequest('uiam_session'),
        security
      );

      expect(
        jest
          .mocked(security.authc.apiKeys.grantAsInternalUser)
          .mock.calls.map(([, { name }]) => name)
      ).toEqual([`TaskManager: ${'x'.repeat(240)}...`]);
      expect(jest.mocked(uiam.grant).mock.calls.map(([, { name }]) => name)).toEqual(
        isEsAndUiam(strategy) ? [`TaskManager-UIAM: ${'x'.repeat(235)}...`] : []
      );
    });
  });

  describe('getApiKeyForFakeRequest', () => {
    const UIAM_FALLBACK_TO_USER_ES_KEY_LOG = [
      'UIAM API key is not provided to create a fake request, falling back to ES API key created by the user.',
      { tags: USAGE_TAGS },
    ];
    const UIAM_FALLBACK_TO_ES_KEY_LOG = [
      'UIAM API key is not provided to create a fake request, falling back to regular API key.',
      { tags: USAGE_TAGS },
    ];
    const ES_FALLBACK_TO_UIAM_KEY_LOG = [
      'ES API key is not provided to create a fake request, falling back to UIAM API key.',
      { tags: USAGE_TAGS },
    ];

    const taskScope = (
      apiKeyCreatedByUser: boolean,
      overrides: Partial<TaskUserScope> = {}
    ): TaskUserScope => ({
      apiKeyId: 'key-id',
      spaceId: SPACE_ID,
      apiKeyCreatedByUser,
      ...overrides,
    });

    interface FakeRequestExpectation {
      returned: string | undefined;
      taskRuns: Array<[string, string]>;
      fallbacks?: Array<[string]>;
      logs?: { debug: unknown[][] };
    }

    interface FakeRequestRow {
      title: string;
      task: Partial<ConcreteTaskInstance>;
      expected: Record<StrategyKind, FakeRequestExpectation>;
    }

    const ENCODED_UIAM_KEY = b64('uiam-id:essu_encoded-secret');
    const ENCODED_NON_UIAM_KEY = b64('uiam-id:not-a-uiam-secret');

    const ES_RUN: FakeRequestExpectation = {
      returned: 'es-key',
      taskRuns: [['es_api_key', 'config']],
    };
    const NOT_SET = (returned: string | undefined): FakeRequestExpectation => ({
      returned,
      taskRuns: [['none', 'not_set']],
    });
    const UIAM_RUN = (
      returned: string,
      reason: 'provisioned' | 'user_created_key'
    ): FakeRequestExpectation => ({ returned, taskRuns: [['uiam_api_key', reason]] });
    const UIAM_RUN_VIA_ES_FALLBACK = (
      returned: string,
      reason: 'provisioned' | 'user_created_key'
    ): FakeRequestExpectation => ({
      ...UIAM_RUN(returned, reason),
      logs: { debug: [ES_FALLBACK_TO_UIAM_KEY_LOG] },
    });

    const ROWS: FakeRequestRow[] = [
      {
        title: 'no credentials, no userScope',
        task: {},
        expected: {
          es: { returned: undefined, taskRuns: [] },
          'es_and_uiam:es': { returned: undefined, taskRuns: [] },
          'es_and_uiam:uiam': { returned: undefined, taskRuns: [] },
        },
      },
      {
        title: 'userScope only',
        task: { userScope: taskScope(false) },
        expected: {
          es: NOT_SET(undefined),
          'es_and_uiam:es': NOT_SET(undefined),
          'es_and_uiam:uiam': NOT_SET(undefined),
        },
      },
      {
        title: 'empty-string apiKey with userScope',
        task: { apiKey: '', userScope: taskScope(false) },
        expected: {
          es: NOT_SET(''),
          'es_and_uiam:es': NOT_SET(''),
          'es_and_uiam:uiam': NOT_SET(''),
        },
      },
      {
        title: 'ES apiKey, no userScope',
        task: { apiKey: 'es-key' },
        expected: {
          es: ES_RUN,
          'es_and_uiam:es': ES_RUN,
          'es_and_uiam:uiam': {
            returned: 'es-key',
            taskRuns: [['es_api_key', 'fallback_unexpected']],
            fallbacks: [['unexpected']],
            logs: { debug: [UIAM_FALLBACK_TO_ES_KEY_LOG] },
          },
        },
      },
      {
        title: 'ES apiKey, apiKeyCreatedByUser false',
        task: { apiKey: 'es-key', userScope: taskScope(false) },
        expected: {
          es: ES_RUN,
          'es_and_uiam:es': ES_RUN,
          'es_and_uiam:uiam': {
            returned: 'es-key',
            taskRuns: [['es_api_key', 'fallback_unexpected']],
            fallbacks: [['unexpected']],
            logs: { debug: [UIAM_FALLBACK_TO_ES_KEY_LOG] },
          },
        },
      },
      {
        title: 'ES apiKey, apiKeyCreatedByUser true',
        task: { apiKey: 'es-key', userScope: taskScope(true) },
        expected: {
          es: ES_RUN,
          'es_and_uiam:es': ES_RUN,
          'es_and_uiam:uiam': {
            returned: 'es-key',
            taskRuns: [['es_api_key', 'user_created_key']],
            fallbacks: [['user_created_key']],
            logs: { debug: [UIAM_FALLBACK_TO_USER_ES_KEY_LOG] },
          },
        },
      },
      {
        title: 'raw UIAM key only, apiKeyCreatedByUser false',
        task: {
          uiamApiKey: 'essu_raw',
          userScope: taskScope(false, { uiamApiKeyId: 'key-id' }),
        },
        expected: {
          es: UIAM_RUN('essu_raw', 'provisioned'),
          'es_and_uiam:es': UIAM_RUN_VIA_ES_FALLBACK('essu_raw', 'provisioned'),
          'es_and_uiam:uiam': UIAM_RUN('essu_raw', 'provisioned'),
        },
      },
      {
        title: 'raw UIAM key only, apiKeyCreatedByUser true',
        task: { uiamApiKey: 'essu_raw', userScope: taskScope(true, { apiKeyId: '' }) },
        expected: {
          es: UIAM_RUN('essu_raw', 'user_created_key'),
          'es_and_uiam:es': UIAM_RUN_VIA_ES_FALLBACK('essu_raw', 'user_created_key'),
          'es_and_uiam:uiam': UIAM_RUN('essu_raw', 'user_created_key'),
        },
      },
      {
        title: 'raw UIAM key only, no userScope',
        task: { uiamApiKey: 'essu_raw' },
        expected: {
          es: UIAM_RUN('essu_raw', 'provisioned'),
          'es_and_uiam:es': UIAM_RUN_VIA_ES_FALLBACK('essu_raw', 'provisioned'),
          'es_and_uiam:uiam': UIAM_RUN('essu_raw', 'provisioned'),
        },
      },
      {
        title: 'base64(id:essu_) UIAM key only',
        task: { uiamApiKey: ENCODED_UIAM_KEY, userScope: taskScope(false) },
        expected: {
          es: UIAM_RUN('essu_encoded-secret', 'provisioned'),
          'es_and_uiam:es': UIAM_RUN_VIA_ES_FALLBACK('essu_encoded-secret', 'provisioned'),
          'es_and_uiam:uiam': UIAM_RUN('essu_encoded-secret', 'provisioned'),
        },
      },
      {
        title: 'base64(id:non-UIAM) value in uiamApiKey only',
        task: { uiamApiKey: ENCODED_NON_UIAM_KEY, userScope: taskScope(false) },
        expected: {
          es: UIAM_RUN(ENCODED_NON_UIAM_KEY, 'provisioned'),
          'es_and_uiam:es': UIAM_RUN_VIA_ES_FALLBACK(ENCODED_NON_UIAM_KEY, 'provisioned'),
          'es_and_uiam:uiam': UIAM_RUN(ENCODED_NON_UIAM_KEY, 'provisioned'),
        },
      },
      {
        title: 'ES apiKey + raw UIAM key, apiKeyCreatedByUser false',
        task: { apiKey: 'es-key', uiamApiKey: 'essu_raw', userScope: taskScope(false) },
        expected: {
          es: ES_RUN,
          'es_and_uiam:es': ES_RUN,
          'es_and_uiam:uiam': UIAM_RUN('essu_raw', 'provisioned'),
        },
      },
      {
        title: 'ES apiKey + base64(id:essu_) UIAM key, apiKeyCreatedByUser true',
        task: { apiKey: 'es-key', uiamApiKey: ENCODED_UIAM_KEY, userScope: taskScope(true) },
        expected: {
          es: ES_RUN,
          'es_and_uiam:es': ES_RUN,
          'es_and_uiam:uiam': UIAM_RUN('essu_encoded-secret', 'user_created_key'),
        },
      },
    ];

    const CASES = ROWS.flatMap(({ title, task, expected }) =>
      ALL_STRATEGIES.map((kind) => ({
        title: `${kind} | ${title}`,
        task,
        kind,
        expected: expected[kind],
      }))
    );

    it.each(CASES)('$title', ({ task, kind, expected }) => {
      const { security } = coreMock.createStart();
      const logger = loggingSystemMock.createLogger();
      const strategy = createStrategy(kind, security, logger);

      const returned = strategy.getApiKeyForFakeRequest(mockTaskInstance(task));
      const logs = collectLogs(logger);

      expect({
        returned,
        taskRuns: recordTaskRunSpy.mock.calls,
        ...(recordUiamApiKeyFallbackSpy.mock.calls.length > 0
          ? { fallbacks: recordUiamApiKeyFallbackSpy.mock.calls }
          : {}),
        ...(Object.keys(logs).length > 0 ? { logs } : {}),
      }).toStrictEqual(expected);
    });
  });

  describe('getApiKeyIdsForInvalidation', () => {
    const userScope = (overrides: Partial<TaskUserScope> = {}): TaskUserScope => ({
      apiKeyId: 'es-key-id',
      spaceId: SPACE_ID,
      apiKeyCreatedByUser: false,
      ...overrides,
    });

    const BOTH_TARGETS = [
      { apiKeyId: 'es-key-id' },
      { apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' },
    ];

    const ROWS: Array<{
      title: string;
      source: ApiKeyInvalidationSource;
      es: InvalidationTarget[];
      esAndUiam: InvalidationTarget[];
    }> = [
      {
        title: 'no userScope',
        source: { apiKey: 'es-key', uiamApiKey: 'essu_uiam-key' },
        es: [],
        esAndUiam: [],
      },
      {
        title: 'apiKeyCreatedByUser true',
        source: {
          apiKey: 'es-key',
          uiamApiKey: 'essu_uiam-key',
          userScope: userScope({ uiamApiKeyId: 'uiam-key-id', apiKeyCreatedByUser: true }),
        },
        es: [],
        esAndUiam: [],
      },
      {
        title: 'ES key only',
        source: { apiKey: 'es-key', userScope: userScope() },
        es: [{ apiKeyId: 'es-key-id' }],
        esAndUiam: [{ apiKeyId: 'es-key-id' }],
      },
      {
        title: 'ES + UIAM keys',
        source: {
          apiKey: 'es-key',
          uiamApiKey: 'essu_uiam-key',
          userScope: userScope({ uiamApiKeyId: 'uiam-key-id' }),
        },
        es: BOTH_TARGETS,
        esAndUiam: BOTH_TARGETS,
      },
      {
        title: 'UIAM-only task (apiKeyId mirrors uiamApiKeyId, no apiKey)',
        source: {
          uiamApiKey: 'essu_uiam-key',
          userScope: userScope({ apiKeyId: 'uiam-key-id', uiamApiKeyId: 'uiam-key-id' }),
        },
        es: [{ apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' }],
        esAndUiam: [{ apiKeyId: 'uiam-key-id', uiamApiKey: 'essu_uiam-key' }],
      },
      {
        title: 'uiamApiKeyId without uiamApiKey',
        source: { apiKey: 'es-key', userScope: userScope({ uiamApiKeyId: 'uiam-key-id' }) },
        es: [{ apiKeyId: 'es-key-id' }],
        esAndUiam: [{ apiKeyId: 'es-key-id' }],
      },
      {
        title: 'uiamApiKey without uiamApiKeyId',
        source: { apiKey: 'es-key', uiamApiKey: 'essu_uiam-key', userScope: userScope() },
        es: [{ apiKeyId: 'es-key-id' }],
        esAndUiam: [{ apiKeyId: 'es-key-id' }],
      },
      {
        title: 'uiamApiKey only without uiamApiKeyId',
        source: { uiamApiKey: 'essu_uiam-key', userScope: userScope() },
        es: [],
        esAndUiam: [],
      },
      {
        title: 'userScope only (no key material)',
        source: { userScope: userScope() },
        es: [],
        esAndUiam: [],
      },
      {
        title: 'base64(id:essu_) uiamApiKey is emitted as stored',
        source: {
          apiKey: 'es-key',
          uiamApiKey: b64('uiam-key-id:essu_uiam-key'),
          userScope: userScope({ uiamApiKeyId: 'uiam-key-id' }),
        },
        es: [
          { apiKeyId: 'es-key-id' },
          { apiKeyId: 'uiam-key-id', uiamApiKey: b64('uiam-key-id:essu_uiam-key') },
        ],
        esAndUiam: [
          { apiKeyId: 'es-key-id' },
          { apiKeyId: 'uiam-key-id', uiamApiKey: b64('uiam-key-id:essu_uiam-key') },
        ],
      },
    ];

    const CASES = ROWS.flatMap(({ title, source, es, esAndUiam }) =>
      ALL_STRATEGIES.map((kind) => ({
        title: `${kind} | ${title}`,
        kind,
        source,
        expected: kind === 'es' ? es : esAndUiam,
      }))
    );

    it.each(CASES)('$title', ({ kind, source, expected }) => {
      const { security } = coreMock.createStart();
      const strategy = createStrategy(kind, security, loggingSystemMock.createLogger());

      expect(strategy.getApiKeyIdsForInvalidation(source)).toStrictEqual(expected);
    });
  });

  describe('markForInvalidation', () => {
    const NOW = '2026-11-02T00:00:00.000Z';

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(NOW) });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(ALL_STRATEGIES)('%s | writes one invalidation SO per target', async (kind) => {
      const { security } = coreMock.createStart();
      const strategyLogger = loggingSystemMock.createLogger();
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();
      const strategy = createStrategy(kind, security, strategyLogger);

      await expect(
        strategy.markForInvalidation(
          [
            { apiKeyId: 'a' },
            { apiKeyId: 'b', uiamApiKey: 'essu_b' },
            { apiKeyId: 'c', uiamApiKey: '' },
            { apiKeyId: 'd', taskId: 'task-d', taskStartedAt: '2026-01-01T00:00:00.000Z' },
            { apiKeyId: 'e', taskId: 'task-e' },
            { apiKeyId: 'f', taskStartedAt: '2026-01-01T00:00:00.000Z' },
            {
              apiKeyId: 'g',
              uiamApiKey: 'essu_g',
              taskId: 'task-g',
              taskStartedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          logger,
          soClient
        )
      ).resolves.toBeUndefined();

      expect(soClient.bulkCreate.mock.calls).toStrictEqual([
        [
          [
            { attributes: { apiKeyId: 'a', createdAt: NOW }, type: 'api_key_to_invalidate' },
            {
              attributes: { apiKeyId: 'b', createdAt: NOW, uiamApiKey: 'essu_b' },
              type: 'api_key_to_invalidate',
            },
            { attributes: { apiKeyId: 'c', createdAt: NOW }, type: 'api_key_to_invalidate' },
            {
              attributes: {
                apiKeyId: 'd',
                createdAt: NOW,
                taskId: 'task-d',
                taskStartedAt: '2026-01-01T00:00:00.000Z',
              },
              type: 'api_key_to_invalidate',
            },
            { attributes: { apiKeyId: 'e', createdAt: NOW }, type: 'api_key_to_invalidate' },
            { attributes: { apiKeyId: 'f', createdAt: NOW }, type: 'api_key_to_invalidate' },
            {
              attributes: {
                apiKeyId: 'g',
                createdAt: NOW,
                uiamApiKey: 'essu_g',
                taskId: 'task-g',
                taskStartedAt: '2026-01-01T00:00:00.000Z',
              },
              type: 'api_key_to_invalidate',
            },
          ],
        ],
      ]);
      expect(collectLogs(logger)).toStrictEqual({});
      expect(collectLogs(strategyLogger)).toStrictEqual({});
    });

    it.each(ALL_STRATEGIES)('%s | does nothing for an empty target list', async (kind) => {
      const { security } = coreMock.createStart();
      const logger = loggingSystemMock.createLogger();
      const soClient = savedObjectsClientMock.create();

      await createStrategy(kind, security, logger).markForInvalidation([], logger, soClient);

      expect(soClient.bulkCreate).not.toHaveBeenCalled();
      expect(collectLogs(logger)).toStrictEqual({});
    });

    it.each(ALL_STRATEGIES)(
      '%s | logs and swallows a bulkCreate failure on the passed logger',
      async (kind) => {
        const { security } = coreMock.createStart();
        const strategyLogger = loggingSystemMock.createLogger();
        const logger = loggingSystemMock.createLogger();
        const soClient = savedObjectsClientMock.create();
        soClient.bulkCreate.mockRejectedValueOnce(new Error('SO error'));

        await expect(
          createStrategy(kind, security, strategyLogger).markForInvalidation(
            [{ apiKeyId: 'a' }, { apiKeyId: 'b', uiamApiKey: 'essu_b' }],
            logger,
            soClient
          )
        ).resolves.toBeUndefined();

        expect(collectLogs(logger)).toStrictEqual({
          error: [['Failed to bulk mark 2 API keys for invalidation: SO error']],
        });
        expect(collectLogs(strategyLogger)).toStrictEqual({});
      }
    );
  });

  describe('buildTaskFakeRequest', () => {
    const describeRequest = (request: KibanaRequest | undefined) =>
      request && {
        headers: request.headers,
        isFakeRequest: request.isFakeRequest,
        spaceId: request.spaceId,
        external: isExternalUiamCredential(request),
      };

    it.each([
      ['undefined apiKey', { apiKey: undefined }, undefined],
      ['empty-string apiKey', { apiKey: '' }, undefined],
      [
        'apiKey only',
        { apiKey: 'abc' },
        {
          headers: { authorization: 'ApiKey abc' },
          isFakeRequest: true,
          spaceId: 'default',
          external: false,
        },
      ],
      [
        'empty-string spaceId',
        { apiKey: 'abc', spaceId: '' },
        {
          headers: { authorization: 'ApiKey abc' },
          isFakeRequest: true,
          spaceId: 'default',
          external: false,
        },
      ],
      [
        'spaceId and uiamApiKeyExternal false',
        { apiKey: 'abc', spaceId: 'space-a', uiamApiKeyExternal: false },
        {
          headers: { authorization: 'ApiKey abc' },
          isFakeRequest: true,
          spaceId: 'space-a',
          external: false,
        },
      ],
      [
        'uiamApiKeyExternal true',
        { apiKey: 'essu_key', uiamApiKeyExternal: true },
        {
          headers: { authorization: 'ApiKey essu_key' },
          isFakeRequest: true,
          spaceId: 'default',
          external: true,
        },
      ],
    ])('%s', (_title, opts, expected) => {
      expect(describeRequest(buildTaskFakeRequest(opts))).toStrictEqual(expected);
    });

    const IDENTITY_CASES: Array<
      [
        { userProfileId?: string; userName?: string },
        Array<{ profileId?: string; username?: string }>
      ]
    > = [
      [{}, []],
      [{ userProfileId: '', userName: '' }, []],
      [{ userProfileId: 'u_1' }, [{ profileId: 'u_1', username: undefined }]],
      [{ userName: 'jdoe' }, [{ profileId: undefined, username: 'jdoe' }]],
      [{ userProfileId: 'u_1', userName: 'jdoe' }, [{ profileId: 'u_1', username: 'jdoe' }]],
    ];

    it.each(IDENTITY_CASES)('enriches with identity %j', (identity, expectedIdentities) => {
      const enrichFakeRequest = jest.fn();
      const request = buildTaskFakeRequest({ apiKey: 'abc', ...identity, enrichFakeRequest });

      expect(
        enrichFakeRequest.mock.calls.map(([enrichedRequest, enrichedIdentity]) => [
          enrichedRequest === request,
          enrichedIdentity,
        ])
      ).toStrictEqual(expectedIdentities.map((expectedIdentity) => [true, expectedIdentity]));
    });

    it('does not enrich when no apiKey is provided', () => {
      const enrichFakeRequest = jest.fn();
      buildTaskFakeRequest({ userProfileId: 'u_1', userName: 'jdoe', enrichFakeRequest });

      expect(enrichFakeRequest).not.toHaveBeenCalled();
    });
  });

  describe('grant -> getApiKeyForFakeRequest -> buildTaskFakeRequest (task runner wiring)', () => {
    // Mirrors task_runner.ts: credentials from the strategy, the rest from the stored userScope.
    const buildRunRequest = (strategy: ApiKeyStrategy, fields: ApiKeySOFields) => {
      const task = mockTaskInstance(fields);
      const enrichFakeRequest = jest.fn();
      const request = buildTaskFakeRequest({
        apiKey: strategy.getApiKeyForFakeRequest(task),
        spaceId: task.userScope?.spaceId,
        userProfileId: task.userScope?.userProfileId,
        userName: task.userScope?.userName,
        uiamApiKeyExternal: task.userScope?.uiamApiKeyExternal,
        enrichFakeRequest,
      });
      return (
        request && {
          authorization: request.headers.authorization,
          spaceId: request.spaceId,
          external: isExternalUiamCredential(request),
          enrichedWith: enrichFakeRequest.mock.calls.map(([, identity]) => identity),
        }
      );
    };

    const ENRICHED = [{ profileId: 'u_profile', username: 'elastic' }];

    const RUN_CASES: Array<[GrantScenario, string, boolean]> = [
      [
        { strategy: 'es', credential: 'session' },
        `ApiKey ${b64('es-granted-1:es-granted-secret-1')}`,
        false,
      ],
      [
        { strategy: 'es_and_uiam:es', credential: 'uiam_session' },
        `ApiKey ${b64('es-granted-1:es-granted-secret-1')}`,
        false,
      ],
      [
        { strategy: 'es_and_uiam:uiam', credential: 'uiam_session' },
        'ApiKey essu_uiam-granted-secret-1',
        false,
      ],
      [
        { strategy: 'es_and_uiam:uiam', credential: 'uiam_raw_api_key' },
        'ApiKey essu_raw-user-key',
        false,
      ],
      [
        { strategy: 'es_and_uiam:uiam', credential: 'uiam_raw_api_key', apiKeyInternal: false },
        'ApiKey essu_raw-user-key',
        true,
      ],
      [
        { strategy: 'es_and_uiam:es', credential: 'uiam_raw_api_key', apiKeyInternal: false },
        'ApiKey essu_raw-user-key',
        true,
      ],
      [
        { strategy: 'es_and_uiam:uiam', credential: 'uiam_encoded_api_key' },
        'ApiKey essu_uiam-user-secret',
        false,
      ],
      [
        { strategy: 'es_and_uiam:uiam', credential: 'es_api_key', apiKeyInternal: false },
        `ApiKey ${b64('es-user-id:es-user-secret')}`,
        false,
      ],
      [
        { strategy: 'es_and_uiam:es', credential: 'uiam_raw_api_key', opts: { cloneApiKey: true } },
        'ApiKey essu_uiam-granted-secret-1',
        false,
      ],
    ];

    it.each(RUN_CASES)(
      '%j runs with %s (external=%s)',
      async (scenario, authorization, external) => {
        const { strategy, result } = await runGrant(scenario);
        const fields = result?.get('task-1');
        if (!fields) {
          throw new Error('Expected task-1 to be granted');
        }

        expect(buildRunRequest(strategy, fields)).toStrictEqual({
          authorization,
          spaceId: SPACE_ID,
          external,
          enrichedWith: ENRICHED,
        });
      }
    );

    it('a UIAM-only task run under EsApiKeyStrategy (rollback) runs with its UIAM key', async () => {
      const { result } = await runGrant({
        strategy: 'es_and_uiam:es',
        credential: 'uiam_raw_api_key',
      });
      const fields = result?.get('task-1');
      if (!fields) {
        throw new Error('Expected task-1 to be granted');
      }
      const { security } = coreMock.createStart();
      const esStrategy = createStrategy('es', security, loggingSystemMock.createLogger());

      expect(buildRunRequest(esStrategy, fields)).toStrictEqual({
        authorization: 'ApiKey essu_raw-user-key',
        spaceId: SPACE_ID,
        external: false,
        enrichedWith: ENRICHED,
      });
      expect(recordTaskRunSpy.mock.calls).toStrictEqual([['uiam_api_key', 'user_created_key']]);
    });
  });
});

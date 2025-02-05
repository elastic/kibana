/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedSimpleSavedObject } from '@kbn/core/public';
import type {
  CREATE_CASES_CAPABILITY,
  DELETE_CASES_CAPABILITY,
  READ_CASES_CAPABILITY,
  UPDATE_CASES_CAPABILITY,
  CREATE_COMMENT_CAPABILITY,
  CASES_REOPEN_CAPABILITY,
  ASSIGN_CASE_CAPABILITY,
} from '..';
import type {
  CASES_CONNECTORS_CAPABILITY,
  CASES_SETTINGS_CAPABILITY,
  PUSH_CASES_CAPABILITY,
} from '../constants';
import type { SnakeToCamelCase } from '../types';
import type {
  CaseSeverity,
  CaseStatuses,
  UserAction,
  Case as CaseSnakeCase,
  User,
  ActionConnector,
  AlertAttachment,
  Attachment,
  ExternalReferenceAttachment,
  PersistableStateAttachment,
  Configuration,
  CustomFieldTypes,
} from '../types/domain';
import type {
  CasePatchRequest,
  CasesFindResponse,
  CaseUserActionStatsResponse,
  GetCaseConnectorsResponse,
  GetCaseUsersResponse,
  UserActionFindRequestTypes,
  UserActionFindResponse,
  CaseMetricsFeature,
  CasesMetricsResponse,
  SingleCaseMetricsResponse,
  CasesSimilarResponse,
} from '../types/api';

type DeepRequired<T> = { [K in keyof T]: DeepRequired<T[K]> } & Required<T>;

export interface CasesContextFeatures {
  alerts: { sync?: boolean; enabled?: boolean; isExperimental?: boolean };
  metrics: SingleCaseMetricsFeature[];
}

export type CasesFeaturesAllRequired = DeepRequired<CasesContextFeatures>;

export type CasesFeatures = Partial<CasesContextFeatures>;

export interface CasesUiConfigType {
  markdownPlugins: {
    lens: boolean;
  };
  files: {
    maxSize?: number;
    allowedMimeTypes: string[];
  };
  stack: {
    enabled: boolean;
  };
}

export const UserActionTypeAll = 'all' as const;
export type CaseUserActionTypeWithAll = UserActionFindRequestTypes | typeof UserActionTypeAll;

/**
 * The type for the `refreshRef` prop (a `React.Ref`) defined by the `CaseViewComponentProps`.
 *
 * @example
 * const refreshRef = useRef<CaseViewRefreshPropInterface>(null);
 * return <CaseComponent refreshRef={refreshRef} ...otherProps>
 */
export type CaseViewRefreshPropInterface = null | {
  /**
   * Refreshes the case its metrics and user actions/comments in the view's timeline
   */
  refreshCase: () => Promise<void>;
};

export type AttachmentUI = SnakeToCamelCase<Attachment>;
export type AlertAttachmentUI = SnakeToCamelCase<AlertAttachment>;
export type ExternalReferenceAttachmentUI = SnakeToCamelCase<ExternalReferenceAttachment>;
export type PersistableStateAttachmentUI = SnakeToCamelCase<PersistableStateAttachment>;
export type UserActionUI = SnakeToCamelCase<UserAction>;
export type FindCaseUserActions = Omit<SnakeToCamelCase<UserActionFindResponse>, 'userActions'> & {
  userActions: UserActionUI[];
};

export interface InternalFindCaseUserActions extends FindCaseUserActions {
  latestAttachments: AttachmentUI[];
}

export type CaseUserActionsStats = SnakeToCamelCase<CaseUserActionStatsResponse>;
export type CaseUI = Omit<SnakeToCamelCase<CaseSnakeCase>, 'comments'> & {
  comments: AttachmentUI[];
};
export type ObservableUI = CaseUI['observables'][0];

export type CasesUI = CaseUI[];
export type CasesFindResponseUI = Omit<SnakeToCamelCase<CasesFindResponse>, 'cases'> & {
  cases: CasesUI;
};
export type CasesMetrics = SnakeToCamelCase<CasesMetricsResponse>;
export type CaseUpdateRequest = SnakeToCamelCase<CasePatchRequest>;
export type CaseConnectors = SnakeToCamelCase<GetCaseConnectorsResponse>;
export type CaseUsers = GetCaseUsersResponse;
export type CaseUICustomField = CaseUI['customFields'][number];
export type CasesSimilarResponseUI = SnakeToCamelCase<CasesSimilarResponse>;
export type SimilarCaseUI = Omit<SnakeToCamelCase<CasesSimilarResponseUI['cases'][0]>, 'comments'>;
export type SimilarCasesUI = SimilarCaseUI[];

export interface ResolvedCase {
  case: CaseUI;
  outcome: ResolvedSimpleSavedObject['outcome'];
  aliasTargetId?: ResolvedSimpleSavedObject['alias_target_id'];
  aliasPurpose?: ResolvedSimpleSavedObject['alias_purpose'];
}

export type CasesConfigurationUI = Pick<
  SnakeToCamelCase<Configuration>,
  | 'closureType'
  | 'connector'
  | 'mappings'
  | 'customFields'
  | 'templates'
  | 'id'
  | 'version'
  | 'owner'
  | 'observableTypes'
>;

export type CasesConfigurationUICustomField = CasesConfigurationUI['customFields'][number];
export type CasesConfigurationUITemplate = CasesConfigurationUI['templates'][number];

export type SortOrder = 'asc' | 'desc';

export const SORT_ORDER_VALUES: SortOrder[] = ['asc', 'desc'];

export interface SortingParams {
  sortField: SortFieldCase;
  sortOrder: SortOrder;
}

export interface QueryParams extends SortingParams {
  page: number;
  perPage: number;
}

export interface SystemFilterOptions {
  search: string;
  searchFields: string[];
  severity: CaseSeverity[];
  status: CaseStatuses[];
  tags: string[];
  assignees: Array<string | null>;
  reporters: User[];
  owner: string[];
  category: string[];
}

export interface FilterOptions extends SystemFilterOptions {
  customFields: {
    [key: string]: {
      type: CustomFieldTypes;
      options: string[];
    };
  };
}

export type SingleCaseMetrics = SingleCaseMetricsResponse;
export type SingleCaseMetricsFeature = Exclude<CaseMetricsFeature, CaseMetricsFeature.MTTR>;

/**
 * If you add a new value here and you want to support it on the URL
 * you have to also add it here x-pack/platform/plugins/shared/cases/public/components/all_cases/schema.ts
 */
export enum SortFieldCase {
  closedAt = 'closedAt',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  severity = 'severity',
  status = 'status',
  title = 'title',
  category = 'category',
}

export type CaseUser = SnakeToCamelCase<User>;

export interface FetchCasesProps extends ApiProps {
  queryParams?: QueryParams;
  filterOptions?: FilterOptions;
}

export interface SimilarCasesProps extends ApiProps {
  caseId: string;
  perPage: number;
  page: number;
}

export interface ApiProps {
  signal?: AbortSignal;
}

export interface ActionLicense {
  id: string;
  name: string;
  enabled: boolean;
  enabledInConfig: boolean;
  enabledInLicense: boolean;
}

export interface FieldMappings {
  id: string;
  title?: string;
}

export type UpdateKey = keyof Pick<
  CasePatchRequest,
  | 'connector'
  | 'description'
  | 'status'
  | 'tags'
  | 'title'
  | 'settings'
  | 'severity'
  | 'assignees'
  | 'category'
  | 'customFields'
>;

export interface UpdateByKey {
  updateKey: UpdateKey;
  updateValue: CasePatchRequest[UpdateKey];
  caseData: CaseUI;
  onSuccess?: () => void;
  onError?: () => void;
}

export interface RuleEcs {
  id?: string[];
  rule_id?: string[];
  name?: string[];
  false_positives?: string[];
  saved_id?: string[];
  timeline_id?: string[];
  timeline_title?: string[];
  max_signals?: number[];
  risk_score?: string[];
  output_index?: string[];
  description?: string[];
  from?: string[];
  immutable?: boolean[];
  index?: string[];
  interval?: string[];
  language?: string[];
  query?: string[];
  references?: string[];
  severity?: string[];
  tags?: string[];
  threat?: unknown;
  threshold?: unknown;
  type?: string[];
  size?: string[];
  to?: string[];
  enabled?: boolean[];
  filters?: unknown;
  created_at?: string[];
  updated_at?: string[];
  created_by?: string[];
  updated_by?: string[];
  version?: string[];
  note?: string[];
  building_block_type?: string[];
}

export interface SignalEcs {
  rule?: RuleEcs;
  original_time?: string[];
  status?: string[];
  group?: {
    id?: string[];
  };
  threshold_result?: unknown;
}

export type SignalEcsAAD = Exclude<SignalEcs, 'rule' | 'status'> & {
  rule?: Exclude<RuleEcs, 'id'> & { parameters: Record<string, unknown>; uuid: string[] };
  building_block_type?: string[];
  workflow_status?: string[];
};

export interface Ecs {
  _id: string;
  _index?: string;
  signal?: SignalEcs;
  kibana?: {
    alert: SignalEcsAAD;
  };
}

export type CaseActionConnector = ActionConnector;

export type UseFetchAlertData = (alertIds: string[]) => [boolean, Record<string, unknown>];

export interface CasesPermissions {
  all: boolean;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  push: boolean;
  connectors: boolean;
  settings: boolean;
  reopenCase: boolean;
  createComment: boolean;
  assign: boolean;
}

export interface CasesCapabilities {
  [CREATE_CASES_CAPABILITY]: boolean;
  [READ_CASES_CAPABILITY]: boolean;
  [UPDATE_CASES_CAPABILITY]: boolean;
  [DELETE_CASES_CAPABILITY]: boolean;
  [PUSH_CASES_CAPABILITY]: boolean;
  [CASES_CONNECTORS_CAPABILITY]: boolean;
  [CASES_SETTINGS_CAPABILITY]: boolean;
  [CREATE_COMMENT_CAPABILITY]: boolean;
  [CASES_REOPEN_CAPABILITY]: boolean;
  [ASSIGN_CASE_CAPABILITY]: boolean;
}

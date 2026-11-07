/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type {
  DecideResult,
  DecisionAnswer,
  DecisionChoiceQuestion,
  DecisionPredicateQuestion,
} from '@kbn/agent-builder-server';
import { createDecisionProviders, DecisionService } from './decision_service';
import { BaseDecisionProvider } from './providers/base_decision_provider';
import { EisDecisionProvider } from './providers/eis';
import { FastModelDecisionProvider } from './providers/fast_model';
import type {
  DecisionProviderId,
  DecisionProviderParams,
  DecisionProviderResult,
} from './providers/types';
import { DecisionProviderUnavailableError } from './providers/types';

const span = { setAttributes: jest.fn() };

jest.mock('@kbn/inference-tracing', () => ({
  ...jest.requireActual('@kbn/inference-tracing'),
  withActiveInferenceSpan: (_name: string, _opts: unknown, cb: (s: typeof span) => unknown) =>
    cb(span),
}));

const shouldRespond: DecisionPredicateQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};

const topic: DecisionChoiceQuestion = {
  type: 'choice',
  instructions: 'What is the message about?',
  choices: { observability: 'Logs, metrics and traces', other: 'Anything else' },
};

const input = 'secret conversation text';

const answered = (probability: number): DecisionProviderResult => ({
  inferenceId: 'model-1',
  answers: [{ type: 'predicate', probability }],
});

const decided = (probability: number) => ({
  status: 'decided',
  inferenceId: 'model-1',
  answer: { type: 'predicate', probability },
});

type Ask = (params: DecisionProviderParams) => Promise<DecisionProviderResult>;

class FakeProvider extends BaseDecisionProvider {
  readonly handler: jest.Mock<Promise<DecisionProviderResult>, [DecisionProviderParams]>;

  constructor(public readonly id: DecisionProviderId, ask: Ask, timeoutMs: number) {
    super({ timeoutMs, unavailableTtlMs: 60 * 60 * 1000 });
    this.handler = jest.fn(ask);
  }

  protected ask(params: DecisionProviderParams): Promise<DecisionProviderResult> {
    return this.handler(params);
  }
}

const fakeProvider = (
  id: DecisionProviderId,
  ask: Ask = async () => answered(0.5),
  timeoutMs = 1000
) => new FakeProvider(id, ask, timeoutMs);

const never = () => new Promise<never>(() => {});

const setup = (providers: FakeProvider[]) => {
  const logger = loggingSystemMock.createLogger();
  const service = new DecisionService({ logger, providers });
  const request = httpServerMock.createKibanaRequest();

  const decide = (abortSignal?: AbortSignal) =>
    service.decide({ request, input, abortSignal }, shouldRespond);

  return { decide, logger, service, request };
};

describe('DecisionService', () => {
  afterEach(() => {
    jest.useRealTimers();
    span.setAttributes.mockClear();
  });

  it('returns a single answer for one question', async () => {
    const provider = fakeProvider('eis', async () => answered(0.9));
    const { decide } = setup([provider]);

    const result = await decide();

    expect(result).toEqual(decided(0.9));
    expect(provider.handler).toHaveBeenCalledWith(
      expect.objectContaining({ input, questions: [shouldRespond] })
    );

    if (result.status === 'decided') {
      const probability: number = result.answer.probability;
      expect(probability).toBe(0.9);
    }
  });

  it('returns the answers in the order of the questions', async () => {
    const choice = {
      type: 'choice',
      choice: 'observability',
      confidence: 0.8,
      probabilities: { observability: 0.8, other: 0.2 },
    } as const;
    const provider = fakeProvider('eis', async () => ({
      inferenceId: 'model-1',
      answers: [{ type: 'predicate', probability: 0.6 }, choice],
    }));
    const { service, request } = setup([provider]);

    const result = await service.decide({ request, input }, shouldRespond, topic);

    expect(result).toEqual({
      status: 'decided',
      inferenceId: 'model-1',
      answers: [{ type: 'predicate', probability: 0.6 }, choice],
    });
    expect(provider.handler).toHaveBeenCalledWith(
      expect.objectContaining({ questions: [shouldRespond, topic] })
    );

    if (result.status === 'decided') {
      const [{ probability }, { choice: picked }] = result.answers;
      expect([probability, picked]).toEqual([0.6, 'observability']);
    }
  });

  it('throws when called without questions', () => {
    const { service, request } = setup([fakeProvider('eis')]);
    expect(() => Reflect.apply(service.decide, service, [{ request, input }])).toThrow(
      'at least one question'
    );
  });

  it('records the provider and inference endpoint that answered on the decide span', async () => {
    const { decide } = setup([
      fakeProvider('eis', async () => {
        throw new Error('boom');
      }),
      fakeProvider('fast_model'),
    ]);

    await decide();

    expect(span.setAttributes).toHaveBeenCalledWith({
      'elastic.decision.status': 'decided',
      'elastic.decision.provider': 'fast_model',
      'elastic.decision.inference_id': 'model-1',
    });
  });

  it('records the status on the decide span when no provider answers', async () => {
    const { decide } = setup([
      fakeProvider('eis', async () => {
        throw new DecisionProviderUnavailableError('no endpoint');
      }),
    ]);

    await decide();

    expect(span.setAttributes).toHaveBeenCalledWith({ 'elastic.decision.status': 'unavailable' });
  });

  it('uses the first provider that answers, in order', async () => {
    const first = fakeProvider('eis', async () => answered(0.9));
    const second = fakeProvider('fast_model');
    const { decide } = setup([first, second]);

    await expect(decide()).resolves.toEqual(decided(0.9));
    expect(second.handler).not.toHaveBeenCalled();
  });

  it('falls through to the next provider on a retryable failure, and retries it next time', async () => {
    const first = fakeProvider('eis', async () => {
      throw new Error('boom');
    });
    const second = fakeProvider('fast_model', async () => answered(0.3));
    const { decide } = setup([first, second]);

    await expect(decide()).resolves.toEqual(decided(0.3));
    await decide();

    expect(first.handler).toHaveBeenCalledTimes(2);
  });

  it('skips a provider that reported it is unavailable', async () => {
    const first = fakeProvider('eis', async () => {
      throw new DecisionProviderUnavailableError('no endpoint');
    });
    const second = fakeProvider('fast_model', async () => answered(0.7));
    const { decide } = setup([first, second]);

    await expect(decide()).resolves.toEqual(decided(0.7));
    await expect(decide()).resolves.toEqual(decided(0.7));

    expect(first.handler).toHaveBeenCalledTimes(1);
    expect(second.handler).toHaveBeenCalledTimes(2);
  });

  it('tries an unavailable provider again once its TTL expires', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-05T10:00:00Z') });

    const first = fakeProvider('eis', async () => answered(0.9));
    const second = fakeProvider('fast_model', async () => answered(0.7));
    const { decide } = setup([first, second]);

    first.handler.mockRejectedValueOnce(new DecisionProviderUnavailableError('no endpoint'));

    await expect(decide()).resolves.toEqual(decided(0.7));

    jest.setSystemTime(new Date('2026-11-05T11:00:00Z'));

    await expect(decide()).resolves.toEqual(decided(0.9));
    expect(first.handler).toHaveBeenCalledTimes(2);
  });

  it('gives each provider its own timeout before moving on', async () => {
    jest.useFakeTimers();

    let firstSignal: AbortSignal | undefined;
    const first = fakeProvider('eis', ({ signal }) => {
      firstSignal = signal;
      return never();
    });
    const second = fakeProvider('fast_model', async () => answered(0.2));
    const { decide, logger } = setup([first, second]);

    const pending = decide();

    await jest.advanceTimersByTimeAsync(999);
    expect(second.handler).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual(decided(0.2));
    expect(firstSignal?.aborted).toBe(true);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("waits for a slower provider's own timeout", async () => {
    jest.useFakeTimers();

    const slow = fakeProvider('fast_model', never, 2000);
    const { decide } = setup([slow]);

    let result: DecideResult<{ answer: DecisionAnswer }> | undefined;

    decide().then((outcome) => {
      result = outcome;
    });

    await jest.advanceTimersByTimeAsync(1000);
    expect(result).toBeUndefined();

    await jest.advanceTimersByTimeAsync(1000);
    expect(result?.status).toBe('failed');
  });

  it('stops the chain when the caller aborts', async () => {
    const controller = new AbortController();
    const first = fakeProvider('eis', () => {
      controller.abort();
      return never();
    });
    const second = fakeProvider('fast_model');
    const { decide } = setup([first, second]);

    const result = await decide(controller.signal);

    expect(result.status).toBe('failed');
    expect(second.handler).not.toHaveBeenCalled();
  });

  it('fails without asking anyone when the caller already aborted', async () => {
    const controller = new AbortController();
    const first = fakeProvider('eis');
    const { decide } = setup([first]);

    controller.abort();

    await expect(decide(controller.signal)).resolves.toEqual(
      expect.objectContaining({ status: 'failed' })
    );
    expect(first.handler).not.toHaveBeenCalled();
  });

  it('returns unavailable when every provider is unavailable', async () => {
    const { decide } = setup([
      fakeProvider('eis', async () => {
        throw new DecisionProviderUnavailableError('no endpoint');
      }),
      fakeProvider('fast_model', async () => {
        throw new DecisionProviderUnavailableError('no model');
      }),
    ]);

    await expect(decide()).resolves.toEqual({ status: 'unavailable' });
  });

  it('returns failed with the last error when every provider fails', async () => {
    const last = new Error('last');
    const { decide } = setup([
      fakeProvider('eis', async () => {
        throw new Error('first');
      }),
      fakeProvider('fast_model', async () => {
        throw last;
      }),
    ]);

    await expect(decide()).resolves.toEqual({ status: 'failed', error: last });
  });

  it('logs retryable failures at warn without the input text', async () => {
    const { decide, logger } = setup([
      fakeProvider('eis', async () => {
        throw new Error('boom');
      }),
      fakeProvider('fast_model', async () => answered(0.5)),
    ]);

    await decide();

    expect(logger.warn).toHaveBeenCalledTimes(1);

    const logged = JSON.stringify([
      ...logger.debug.mock.calls,
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls,
    ]);

    expect(logged).not.toContain(input);
  });
});

describe('createDecisionProviders', () => {
  const elasticsearch = elasticsearchServiceMock.createStart();
  const createModelProvider = jest.fn();

  it('orders EIS, then the fast model', () => {
    const providers = createDecisionProviders({
      elasticsearch,
      createModelProvider,
      config: {
        eisTimeoutMs: 1000,
        fastModelTimeoutMs: 2000,
        unavailableTtlMs: 3600000,
      },
    });

    expect(providers.map(({ id }) => id)).toEqual(['eis', 'fast_model']);
  });

  it('creates EIS and fast model provider instances', () => {
    const [eis, fastModel] = createDecisionProviders({
      elasticsearch,
      createModelProvider,
      config: {
        eisTimeoutMs: 1000,
        fastModelTimeoutMs: 2000,
        unavailableTtlMs: 3600000,
      },
    });

    expect(eis).toBeInstanceOf(EisDecisionProvider);
    expect(fastModel).toBeInstanceOf(FastModelDecisionProvider);
    expect([eis, fastModel].every((provider) => provider.isAvailable())).toBe(true);
  });
});

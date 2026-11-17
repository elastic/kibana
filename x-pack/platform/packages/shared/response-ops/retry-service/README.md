# @kbn/response-ops-retry-service

This package provides a retry service with configurable backoff strategies for handling transient errors in server-side code. It implements the [Exponential Backoff and Jitter algorithm](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) by Amazon.

`RetryService` owns the retry policy: the maximum number of attempts, the backoff delay and the `isRetryableError` decision. An instance holds nothing else, so one instance can run any number of operations, including concurrently. How attempts and retries are logged is left to a `RetryReporter` passed per run, so the service fits any logging convention.

## Usage

```typescript
import {
  RetryService,
  createLoggerRetryReporter,
  fullJitterBackoffFactory,
} from '@kbn/response-ops-retry-service';
import type { BackoffFactory } from '@kbn/response-ops-retry-service';

class MyRetryService extends RetryService {
  protected isRetryableError(error: Error): boolean {
    // Implement your retry logic
    return error.statusCode === 429;
  }
}

const backoffFactory = fullJitterBackoffFactory({
  baseDelay: 100,
  maxBackoffTime: 5000,
});

const retryService = new MyRetryService(backoffFactory);
const reporter = createLoggerRetryReporter(logger, 'MyService');

await retryService.retryWithBackoff(async () => {
  // Your code that might fail
}, reporter);
```

`createLoggerRetryReporter(logger, serviceName)` writes attempts as debug lines and retries as warnings to a core `Logger`, prefixed with `[<serviceName>][retryWithBackoff]`. The reporter is optional; without one the run is silent.

A subclass that always reports the same way can bind the reporter once:

```typescript
class MyRetryService extends RetryService {
  private readonly reporter: RetryReporter;

  constructor(logger: Logger, backoffFactory: BackoffFactory) {
    super(backoffFactory);
    this.reporter = createLoggerRetryReporter(logger, 'MyService');
  }

  public retryWithBackoff<T>(cb: () => Promise<T>): Promise<T> {
    return super.retryWithBackoff(cb, this.reporter);
  }

  protected isRetryableError(error: Error): boolean {
    return error.statusCode === 429;
  }
}
```

## Custom reporters

Implement `RetryReporter` when retries must be logged in another shape, for example with a structured error and a log code:

```typescript
import type { RetryReporter } from '@kbn/response-ops-retry-service';

const reporter: RetryReporter = {
  onAttempt: () => {},
  onRetry: (error, attempt) => {
    structuredLogger.warn({ message: `Retrying (attempt ${attempt})`, code: 'RETRY', error });
  },
  onSettled: () => {},
};
```

| Method | When |
| --- | --- |
| `onAttempt(attempt)` | An attempt is about to run. `attempt` is `0` for the first run. |
| `onRetry(error, attempt)` | The previous attempt threw a retryable error; attempt `attempt` runs after the backoff delay. |
| `onSettled(attempt)` | The run settled: success, a non-retryable error, or attempts exhausted. Called once per run. |

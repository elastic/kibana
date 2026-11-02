# @kbn/response-ops-retry-service

This package provides a retry service with configurable backoff strategies for handling transient errors in server-side code. It implements the [Exponential Backoff and Jitter algorithm](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) by Amazon.

`RetryService` owns the retry policy: the attempt counter, the backoff delay and the `isRetryableError` decision. How attempts and retries are logged is left to a `RetryReporter`, so the service fits any logging convention.

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

const retryService = new MyRetryService(
  createLoggerRetryReporter(logger, 'MyService'),
  backoffFactory
);
await retryService.retryWithBackoff(async () => {
  // Your code that might fail
});
```

`createLoggerRetryReporter(logger, serviceName)` writes attempts as debug lines and retries as warnings to a core `Logger`, prefixed with `[<serviceName>][retryWithBackoff]`.

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
| `onSettled(attempt)` | The run settled: success, a non-retryable error, or attempts exhausted. |

Note: a `RetryService` instance keeps its attempt counter, so create a new instance per operation.

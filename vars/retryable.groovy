import groovy.transform.Field

public static @Field GLOBAL_RETRIES_ENABLED = false
public static @Field MAX_GLOBAL_RETRIES = 1
public static @Field CURRENT_GLOBAL_RETRIES = 0
public static @Field FLAKY_FAILURES = []

def setMax(max) {
  retryable.MAX_GLOBAL_RETRIES = max
}

def enable() {
  retryable.GLOBAL_RETRIES_ENABLED = true
}

def enable(max) {
  enable()
  setMax(max)
}

def haveReachedMaxRetries() {
  return retryable.CURRENT_GLOBAL_RETRIES >= retryable.MAX_GLOBAL_RETRIES
}

def getFlakyFailures() {
  return retryable.FLAKY_FAILURES
}

def call(label, Closure closure) {
  if (!retryable.GLOBAL_RETRIES_ENABLED) {
    closure()
    return
  }

  try {
    closure()
  } catch (ex) {
    if (haveReachedMaxRetries()) {
      print "Couldn't retry '${label}', have already reached the max number of retries for this build."
      throw ex
    }

    retryable.CURRENT_GLOBAL_RETRIES++
    print ex.toString() // TODO replace with unsandboxed hudson.Functions.printThrowable(ex)
    unstable "${label} failed but is retryable, trying a second time..."

    def JOB = env.JOB ? "" : "${env.JOB}-retry"
    withEnv([
      "JOB=${JOB}",
    ]) {
      closure()
    }

    retryable.FLAKY_FAILURES << [
      label: label,
      exception: ex,
    ]

    unstable "${label} failed on the first attempt, but succeeded on the second. Marking it as flaky."
  }
}

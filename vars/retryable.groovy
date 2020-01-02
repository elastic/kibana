MAX_GLOBAL_RETRIES = 1
CURRENT_GLOBAL_RETRIES = 0
FLAKY_FAILURES = []

def setMax(max) {
  MAX_GLOBAL_RETRIES = max
}

def haveReachedMaxRetries() {
  return CURRENT_GLOBAL_RETRIES >= MAX_GLOBAL_RETRIES
}

def getFlakyFailures() {
  return FLAKY_FAILURES
}

def call(label, Closure closure) {
  try {
    closure()
  } catch (ex) {
    if (haveReachedMaxRetries()) {
      print "Couldn't retry '${label}', have already reached the max number of retries for this build."
      throw ex
    }

    CURRENT_GLOBAL_RETRIES++
    print ex.toString()
    unstable "${label} failed but is retryable, trying a second time..."

    closure()

    FLAKY_FAILURES << [
      label: label,
      exception: ex,
    ]

    unstable "${label} failed on the first attempt, but succeeded on the second. Marking it as flaky."
  }
}

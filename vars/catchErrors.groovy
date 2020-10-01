// Basically, this is a shortcut for catchError(catchInterruptions: false) {}
// By default, catchError will swallow aborts/timeouts, which we almost never want
// Also, by wrapping it in an additional try/catch, we cut down on spam in Pipeline Steps
def call(Map params = [:], Closure closure) {
  try {
    closure()
  } catch (ex) {
    params.catchInterruptions = false
    catchError(params) {
      throw ex
    }
  }
}

return this

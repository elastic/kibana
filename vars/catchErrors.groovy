// Basically, this is a shortcut for catchError(catchInterruptions: false) {}
// By default, catchError will swallow aborts/timeouts, which we almost never want
def call(Map params = [:], Closue closure) {
  params.catchInterruptions = false
  return catchError(params, closure)
}

return this

def call(retryTimes, delaySecs, closure) {
  retry(retryTimes) {
    try {
      closure()
    } catch (ex) {
      sleep delaySecs
      throw ex
    }
  }
}

def call(retryTimes, Closure closure) {
  call(retryTimes, 15, closure)
}

return this

def call(retryTimes, delaySecs, closure) {
  retry(retryTimes) {
    try {
      closure()
    } catch (org.jenkinsci.plugins.workflow.steps.FlowInterruptedException ex) {
      throw ex // Immediately re-throw build abort exceptions, don't sleep first
    } catch (Exception ex) {
      sleep delaySecs
      throw ex
    }
  }
}

def call(retryTimes, Closure closure) {
  call(retryTimes, 15, closure)
}

return this

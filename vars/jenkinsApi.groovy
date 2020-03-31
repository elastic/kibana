def getSteps() {
  def url = "${env.BUILD_URL}api/json?tree=actions[nodes[iconColor,running,displayName,id,parents]]"
  def responseRaw = httpRequest([ method: "GET", url: url ])
  def response = toJSON(responseRaw)

  def graphAction = response?.actions?.find { it._class == "org.jenkinsci.plugins.workflow.job.views.FlowGraphAction" }

  return graphAction?.nodes
}

def getFailedSteps() {
  def steps = getSteps()
  def failedSteps = steps?.findAll { it.iconColor == "red" && it._class == "org.jenkinsci.plugins.workflow.cps.nodes.StepAtomNode" }
  failedSteps.each { step ->
    step.logs = "${env.BUILD_URL}execution/node/${step.id}/log".toString()
  }

  return failedSteps
}

return this

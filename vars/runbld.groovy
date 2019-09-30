def call(script, enableJunitProcessing = false) {
  def extraConfig = enableJunitProcessing ? "" : "--config ${env.WORKSPACE}/kibana/.ci/runbld_no_junit.yml"

  sh "/usr/local/bin/runbld -d '${pwd()}' ${extraConfig} ${script}"
}

def junit() {
  sh "/usr/local/bin/runbld -d '${pwd()}' ${env.WORKSPACE}/kibana/test/scripts/jenkins_runbld_junit.sh"
}

return this

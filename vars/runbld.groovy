def call(script, label, enableJunitProcessing = false) {
  def extraConfig = enableJunitProcessing ? "" : "--config ${env.WORKSPACE}/kibana/.ci/runbld_no_junit.yml"

  sh(
    script: "/usr/local/bin/runbld -d '${pwd()}' ${extraConfig} ${script}",
    label: label ?: script
  )
}

def junit() {
  sh(
    script: "/usr/local/bin/runbld -d '${pwd()}' ${env.WORKSPACE}/kibana/test/scripts/jenkins_runbld_junit.sh",
    label: "Process JUnit reports with runbld"
  )
}

return this

def print() {
  catchError(catchInterruptions: false, buildResult: null) {
    def startTime = sh(script: "date -d '-3 minutes' -Iseconds | sed s/+/%2B/", returnStdout: true).trim()
    def endTime = sh(script: "date -d '+1 hour 30 minutes' -Iseconds | sed s/+/%2B/", returnStdout: true).trim()

    def resourcesUrl =
      (
        "https://infra-stats.elastic.co/app/kibana#/visualize/edit/8bd92360-1b92-11ea-b719-aba04518cc34" +
        "?_g=(time:(from:'${startTime}',to:'${endTime}'))" +
        "&_a=(query:'host.name:${env.NODE_NAME}')"
      )
      .replaceAll("'", '%27') // Need to escape ' because of the shell echo below, but can't really replace "'" with "\'" because of groovy sandbox
      .replaceAll(/\)$/, '%29') // This is just here because the URL parsing in the Jenkins console doesn't work right

    def logsStartTime = sh(script: "date -d '-3 minutes' +%s", returnStdout: true).trim()
    def logsUrl =
      (
        "https://infra-stats.elastic.co/app/infra#/logs" +
        "?_g=()&flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)" +
        "&logFilter=(expression:'host.name:${env.NODE_NAME}',kind:kuery)" +
        "&logPosition=(position:(time:${logsStartTime}000),streamLive:!f)"
      )
      .replaceAll("'", '%27')
      .replaceAll('\\)', '%29')

    sh script: """
      set +x
      echo 'Resource Graph:'
      echo '${resourcesUrl}'
      echo ''
      echo 'Agent Logs:'
      echo '${logsUrl}'
      echo ''
      echo 'SSH Command:'
      echo "ssh -F ssh_config \$(hostname --ip-address)"
    """, label: "Worker/Agent/Node debug links"
  }
}

return this

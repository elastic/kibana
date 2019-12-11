def print() {
  try {
    def startTime = sh(script: "date -d '-15 minutes' -Iseconds | sed s/+/%2B/", returnStdout: true).trim()
    def endTime = sh(script: "date -d '+2 hours' -Iseconds | sed s/+/%2B/", returnStdout: true).trim()

    def resourcesUrl =
      (
        "https://infra-stats.elastic.co/app/kibana#/visualize/edit/8bd92360-1b92-11ea-b719-aba04518cc34?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:" +
        "(from:'${startTime}',to:'${endTime}')" +
        ")&_a=(filters:!(),linked:!f,query:(language:lucene," +
        "query:'host.name:${env.NODE_NAME}'" +
        "),uiState:(),vis:(aggs:!((enabled:!t,id:'2',params:(drop_partials:!f,extended_bounds:(),field:'@timestamp',interval:m,min_doc_count:1," +
        "timeRange:(from:'${startTime}',to:'${endTime}'),useNormalizedEsInterval:!t),schema:segment,type:date_histogram),(enabled:!t,id:'4',params:(customLabel:'Memory%20Usage',field:system.memory.actual.used.pct),schema:metric,type:avg),(enabled:!t,id:'5',params:(customLabel:'I%2FO%20Wait',field:system.cpu.iowait.pct),schema:metric,type:avg),(enabled:!t,id:'7',params:(field:system.load.1),schema:metric,type:avg)),params:(addLegend:!t,addTimeMarker:!f,addTooltip:!t,categoryAxes:!((id:CategoryAxis-1,labels:(show:!t,truncate:100),position:bottom,scale:(type:linear),show:!t,style:(),title:(),type:category)),dimensions:(x:(accessor:0,aggType:date_histogram,format:(id:date,params:(pattern:'HH:mm')),params:(bounds:(max:'2019-10-05T13:33:14.067Z',min:'2019-10-05T12:23:09.104Z'),date:!t,format:'HH:mm',interval:PT1M)),y:!((accessor:1,aggType:avg,format:(id:percent),params:()),(accessor:2,aggType:avg,format:(id:percent),params:()),(accessor:3,aggType:avg,format:(id:number),params:()))),grid:(categoryLines:!f,style:(color:%23eee)),legendPosition:right,seriesParams:!((data:(id:'4',label:'Memory%20Usage'),drawLinesBetweenPoints:!t,mode:normal,show:!t,showCircles:!t,type:line,valueAxis:ValueAxis-1),(data:(id:'5',label:'I%2FO%20Wait'),drawLinesBetweenPoints:!t,mode:normal,show:!t,showCircles:!t,type:line,valueAxis:ValueAxis-1),(data:(id:'7',label:'Average%20system.load.1'),drawLinesBetweenPoints:!t,mode:normal,show:!t,showCircles:!t,type:line,valueAxis:ValueAxis-2)),times:!(),type:line,valueAxes:!((id:ValueAxis-1,labels:(filter:!f,rotate:0,show:!t,truncate:100),name:LeftAxis-1,position:left,scale:(mode:normal,type:linear),show:!t,style:(),title:(text:'Average%20system.cpu.total.pct'),type:value),(id:ValueAxis-2,labels:(filter:!f,rotate:0,show:!t,truncate:100),name:RightAxis-1,position:right,scale:(defaultYExtents:!f,mode:wiggle,setYExtents:!f,type:linear),show:!t,style:(),title:(text:'Average%20system.cpu.total.pct'),type:value))),title:'Jenkins%20Agent%20Metrics%20(Kibana%20CI)',type:line))"
      )
      .replaceAll("'", '%27') // Need to escape ' because of the shell echo below, but can't really replace "'" with "\'" because of groovy sandbox
      .replaceAll(/\)\)$/, '%29%29') // This is just here because the URL parsing in the Jenkins console doesn't work right

    def logsStartTime = sh(script: "date -d '-30 minutes' +%s", returnStdout: true).trim()
    def logsUrl =
      "https://infra-stats.elastic.co/app/infra#/logs?_g=()&flyoutOptions=(flyoutId:!n,flyoutVisibility:hidden,surroundingLogsId:!n)&logFilter=(expression:'host.name:${env.NODE_NAME}',kind:kuery)&logPosition=(position:(tiebreaker:23385715,time:${logsStartTime}000),streamLive:!f)"
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
  } catch(ex) {
    print ex.toString()
  }
}

return this

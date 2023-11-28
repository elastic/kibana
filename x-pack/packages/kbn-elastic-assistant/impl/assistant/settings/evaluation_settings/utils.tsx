/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Link to Discover for viewing an evaluation
 *
 * @param basePath
 * @param evaluationId
 */
export const getDiscoverLink = (basePath: string, evaluationId: string) => {
  return `${basePath}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-1y%2Fd,to:now))&_a=(columns:!(evaluationId,runName,totalAgents,totalInput,totalRequests,input,reference,prediction,evaluation.value,evaluation.reasoning,connectorName,connectorName.keyword,evaluation.__run.runId,evaluation.__run.runId.keyword,evaluation.score,evaluationEnd,evaluationId.keyword,evaluationStart,input.keyword,inputExampleId,inputExampleId.keyword,evaluationDuration,prediction.keyword,predictionResponse.reason.sendToLLM,predictionResponse.status,ConnectorId,predictionResponse.value.data,predictionResponse.value.data.keyword,predictionResponse.value.status,predictionResponse.value.trace_data.trace_id,predictionResponse.value.trace_data.trace_id.keyword,predictionResponse.value.trace_data.transaction_id,predictionResponse.value.trace_data.transaction_id.keyword,reference.keyword,runName.keyword),filters:!(),grid:(columns:('@timestamp':(width:212),ConnectorId:(width:133),connectorName:(width:181),connectorName.keyword:(width:229),evaluation.__run.runId:(width:282),evaluation.__run.runId.keyword:(width:245),evaluation.reasoning:(width:336),evaluation.reasoning.keyword:(width:232),evaluation.score:(width:209),evaluation.value:(width:156),evaluationDuration:(width:174),evaluationEnd:(width:151),evaluationId:(width:130),evaluationId.keyword:(width:186),evaluationStart:(width:202),input:(width:347),input.keyword:(width:458),prediction:(width:264),prediction.keyword:(width:313),predictionResponse.value.connector_id:(width:294),predictionResponse.value.trace_data.trace_id:(width:278),predictionResponse.value.trace_data.transaction_id.keyword:(width:177),reference:(width:305),reference.keyword:(width:219),runName:(width:405),totalAgents:(width:125),totalInput:(width:111),totalRequests:(width:138))),hideChart:!t,index:ce1b41cb-6298-4612-a33c-ba85b3c18ec7,interval:auto,query:(esql:'from%20.kibana-elastic-ai-assistant-evaluation-results%20%0A%7C%20keep%20@timestamp,%20evaluationId,%20runName,%20totalAgents,%20totalInput,%20totalRequests,%20input,%20reference,%20prediction,%20evaluation.value,%20evaluation.reasoning,%20connectorName,%20*%0A%7C%20drop%20evaluation.reasoning.keyword%0A%7C%20rename%20predictionResponse.value.connector_id%20as%20ConnectorId%0A%7C%20where%20evaluationId%20%3D%3D%20%22${evaluationId}%22%0A%7C%20sort%20@timestamp%20desc%0A%7C%20limit%20100%0A%0A%0A'),rowHeight:15,sort:!(!('@timestamp',desc)))`;
};

/**
 * Link to APM Trace Explorer for viewing an evaluation
 * @param basePath
 * @param evaluationId
 */
export const getApmLink = (basePath: string, evaluationId: string) => {
  return `${basePath}/app/apm/traces/explorer/waterfall?comparisonEnabled=false&detailTab=timeline&environment=ENVIRONMENT_ALL&kuery=&query=%22labels.evaluationId%22:%20%22${evaluationId}%22&rangeFrom=now-1y&rangeTo=now&showCriticalPath=false&traceId=451662121b1f5e6c44084ad7415b9409&transactionId=5f1392fa04766025&type=kql&waterfallItemId=`;
};

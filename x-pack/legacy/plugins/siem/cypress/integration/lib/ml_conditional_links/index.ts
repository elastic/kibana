/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * These links are for different test scenarios that try and capture different drill downs into
 * ml-network and ml-hosts and are of the flavor of testing:
 * A filter being null: (query:!n)
 * A filter being set with single values: query=(query:%27process.name%20:%20%22conhost.exe%22%27,language:kuery)
 * A filter being set with multiple values:  query=(query:%27process.name%20:%20%22conhost.exe,sc.exe%22%27,language:kuery)
 * A filter containing variables not replaced:  query=(query:%27process.name%20:%20%$process.name$%22%27,language:kuery)
 *
 * In different combination with:
 * network not being set: $ip$
 * host not being set: $host.name$
 * ...or...
 * network being set normally: 127.0.0.1
 * host being set normally: suricata-iowa
 * ...or...
 * network having multiple values: 127.0.0.1,127.0.0.2
 * host having multiple values: suricata-iowa,siem-windows
 */

// Single IP with a null for the Query:
export const mlNetworkSingleIpNullKqlQuery =
  "/app/siem#/ml-network/ip/127.0.0.1?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// Single IP with a value for the Query:
export const mlNetworkSingleIpKqlQuery =
  "/app/siem#/ml-network/ip/127.0.0.1?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// Multiple IPs with a null for the Query:
export const mlNetworkMultipleIpNullKqlQuery =
  "/app/siem#/ml-network/ip/127.0.0.1,127.0.0.2?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-12T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// Multiple IPs with a value for the Query:
export const mlNetworkMultipleIpKqlQuery =
  "/app/siem#/ml-network/ip/127.0.0.1,127.0.0.2?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// $ip$ with a null Query:
export const mlNetworkNullKqlQuery =
  "/app/siem#/ml-network/ip/$ip$?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// $ip$ with a value for the Query:
export const mlNetworkKqlQuery =
  "/app/siem#/ml-network/ip/$ip$?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T11:00:00.000Z',kind:absolute,to:'2019-12-21T13:59:59.999Z')))";

// Single host name with a null for the Query:
export const mlHostSingleHostNullKqlQuery =
  "/app/siem#/ml-hosts/siem-windows?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Single host name with a variable in the Query:
export const mlHostSingleHostKqlQueryVariable =
  "/app/siem#/ml-hosts/siem-windows?query=(language:kuery,query:'process.name%20:%20%22$process.name$%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Single host name with a value for Query:
export const mlHostSingleHostKqlQuery =
  "/app/siem#/ml-hosts/siem-windows?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Multiple host names with null for Query:
export const mlHostMultiHostNullKqlQuery =
  "/app/siem#/ml-hosts/siem-windows,siem-suricata?query=!n&&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Multiple host names with a value for Query:
export const mlHostMultiHostKqlQuery =
  "/app/siem#/ml-hosts/siem-windows,siem-suricata?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Undefined/null host name with a null for the KQL:
export const mlHostVariableHostNullKqlQuery =
  "/app/siem#/ml-hosts/$host.name$?query=!n&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

// Undefined/null host name but with a value for Query:
export const mlHostVariableHostKqlQuery =
  "/app/siem#/ml-hosts/$host.name$?query=(language:kuery,query:'process.name%20:%20%22conhost.exe,sc.exe%22')&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')),timeline:(linkTo:!(global),timerange:(from:'2019-12-19T06:00:00.000Z',kind:absolute,to:'2019-12-21T05:59:59.999Z')))";

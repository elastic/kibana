/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ABSOLUTE_DATE_RANGE = {
  url:
    '/app/siem#/network/?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',

  urlUnlinked:
    '/app/siem#/network/?timerange=(global:(linkTo:!(),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(),timerange:(from:1564776209186,kind:absolute,to:1564779809186)))',
  urlKqlNetworkNetwork: `/app/siem#/network/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlNetworkHosts: `/app/siem#/network/?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlHostsNetwork: `/app/siem#/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlKqlHostsHosts: `/app/siem#/hosts/allHosts?query=(language:kuery,query:'source.ip:%20"10.142.0.9"')&timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))`,
  urlHost:
    '/app/siem#/hosts/authentications?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1564691609186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1564691609186)))',
  urlHostNew:
    '/app/siem#/hosts/authentications?timerange=(global:(linkTo:!(timeline),timerange:(from:1564689809186,kind:absolute,to:1577914409186)),timeline:(linkTo:!(global),timerange:(from:1564689809186,kind:absolute,to:1577914409186)))',
};

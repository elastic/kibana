/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { format as formatUrl } from 'url';
import { esTestConfig, kbnTestConfig, kibanaServerTestUser } from '@kbn/test';
import { services } from './services';

export default function () {
  const servers = {
    kibana: kbnTestConfig.getUrlParts(),
    elasticsearch: esTestConfig.getUrlParts(),
  };

  return {
    servers,

    esTestCluster: {
      serverArgs: ['xpack.security.enabled=false'],
    },

    kbnTestServer: {
      buildArgs: [],
      sourceArgs: ['--no-base-path', '--env.name=development'],
      serverArgs: [
        `--server.port=${kbnTestConfig.getPort()}`,
        '--status.allowAnonymous=true',
        // We shouldn't embed credentials into the URL since Kibana requests to Elasticsearch should
        // either include `kibanaServerTestUser` credentials, or credentials provided by the test
        // user, or none at all in case anonymous access is used.
        `--elasticsearch.hosts=${formatUrl(
          Object.fromEntries(
            Object.entries(servers.elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
          )
        )}`,
        `--elasticsearch.username=${kibanaServerTestUser.username}`,
        `--elasticsearch.password=${kibanaServerTestUser.password}`,
        // Needed for async search functional tests to introduce a delay
        `--data.search.aggs.shardDelay.enabled=true`,
        `--security.showInsecureClusterWarning=false`,
        '--telemetry.banner=false',
        '--telemetry.optIn=false',
        // These are *very* important to have them pointing to staging
        '--telemetry.sendUsageTo=staging',
        `--server.maxPayload=1679958`,
        // newsfeed mock service
        `--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'newsfeed')}`,
        `--newsfeed.service.urlRoot=${servers.kibana.protocol}://${servers.kibana.hostname}:${servers.kibana.port}`,
        `--newsfeed.service.pathTemplate=/api/_newsfeed-FTS-external-service-simulators/kibana/v{VERSION}.json`,
        // code coverage reporting plugin
        ...(!!process.env.CODE_COVERAGE
          ? [`--plugin-path=${path.join(__dirname, 'fixtures', 'plugins', 'coverage')}`]
          : []),
        '--logging.appenders.deprecation.type=console',
        '--logging.appenders.deprecation.layout.type=json',
        '--logging.loggers[0].name=elasticsearch.deprecation',
        '--logging.loggers[0].level=all',
        '--logging.loggers[0].appenders[0]=deprecation',
      ],
    },
    services,
  };
}

'use strict'; // eslint-disable-line

define(function (require) {
  require('intern/dojo/node!../support/env_setup');

  const bdd = require('intern!bdd');
  const intern = require('intern');

  global.__kibana__intern__ = { intern, bdd };
  const kbnInternVars = global.__kibana__intern__;
  const config = kbnInternVars.intern.config;

  bdd.describe('kibana', function () {
    let PageObjects;
    let support;

    bdd.before(function () {
      PageObjects.init(this.remote);
      support.init(this.remote);
    });
    const supportPages = [
      'intern/dojo/node!../support/page_objects',
      'intern/dojo/node!../support'
    ];

    const url = require('intern/dojo/node!url');
    const fs = require('intern/dojo/node!fs');
    const readline = require('intern/dojo/node!readline');
    const Stream = require('intern/dojo/node!stream');

    const instream = fs.createReadStream('./qa/envvars.sh');
    const outstream = new Stream;
    const rl = readline.createInterface(instream, outstream);
    const varHashMap = new Map;

    rl.on('line', function (line) {
      // process line here
      if (!line.startsWith('#') && line.length > 2) {
        // console.log(line);
        const varb = line.split('=')[0];
        const val = line.split('=')[1];
        varHashMap[varb] =  val;
      }
    });
    rl.on('close', function () {
      global.varHashMap = varHashMap;
      console.log('PRODUCTS=' + varHashMap.PRODUCTS);
      console.log('XPACK=' + varHashMap.XPACK);
      console.log('VM=' + varHashMap.VM);
      console.log('KIBANAURL=' + varHashMap.KIBANAURL);
      const TEST_KIBANA_URL = url.parse(varHashMap.KIBANAURL);
      config.servers.kibana.username = TEST_KIBANA_URL.auth.split(':')[0];
      config.servers.kibana.password = TEST_KIBANA_URL.auth.split(':')[1];
      config.servers.kibana.auth = `${config.servers.kibana.username}:${config.servers.kibana.password}`;
      config.servers.kibana.protocol = TEST_KIBANA_URL.protocol.replace(':','');
      config.servers.kibana.hostname = TEST_KIBANA_URL.hostname;
      config.servers.kibana.port = parseInt(TEST_KIBANA_URL.port, 10);

      console.log('ESURL=' + varHashMap.ESURL);
      const TEST_ES_URL = url.parse(varHashMap.ESURL);
      config.servers.elasticsearch.username = TEST_ES_URL.auth.split(':')[0];
      config.servers.elasticsearch.password = TEST_ES_URL.auth.split(':')[1];
      config.servers.elasticsearch.auth = `${config.servers.elasticsearch.username}:${config.servers.elasticsearch.password}`;
      config.servers.elasticsearch.protocol = TEST_ES_URL.protocol.replace(':','');
      config.servers.elasticsearch.hostname = TEST_ES_URL.hostname;
      config.servers.elasticsearch.port = parseInt(TEST_ES_URL.port, 10);

      // set base apps - always include management.  It gets the versionInfo that reporting need
      // and more importantly create a default index pattern
      const apps = [];

      // one of these 2 needs to create the default index pattern
      if (varHashMap.PRODUCTS.includes('logstash')) {
        apps.push('intern/dojo/node!./apps/management');
      } else {
        apps.push('intern/dojo/node!./apps/sampleData');
      }

      // get the opt in/out banner out of the way early
      if (varHashMap.XPACK === 'YES') {
        apps.push('intern/dojo/node!./apps/telemetry');
//         apps.push('intern/dojo/node!./apps/code'); Code is off by default in 7.3.0
      }

      if (varHashMap.BEATS.includes('metricbeat')) {
        apps.push('intern/dojo/node!./apps/metricbeat');
      }
      if (varHashMap.BEATS.includes('filebeat')) {
        apps.push('intern/dojo/node!./apps/filebeat');
      }
      if (varHashMap.BEATS.includes('packetbeat')) {
        apps.push('intern/dojo/node!./apps/packetbeat');
      }
      if (varHashMap.BEATS.includes('winlogbeat')) {
        apps.push('intern/dojo/node!./apps/winlogbeat');
      }
      if (varHashMap.BEATS.includes('heartbeat')) {
        apps.push('intern/dojo/node!./apps/heartbeat');
      }
//      if (varHashMap.PRODUCTS.includes('apm-server')) {
//        apps.push('intern/dojo/node!./apps/apm');
//      }

      if (varHashMap.VM === 'ubuntu16_tar_ccs') {
        apps.push('intern/dojo/node!./apps/ccs');
        // apps.push('intern/dojo/node!./apps/reporting');
      }

      // with latest elasticsearch Js client, we can only run these watcher tests
      // which use the watcher API on a config with x-pack but without TLS (no security)
      if (varHashMap.VM === 'ubuntu16_tar') {
        apps.push('intern/dojo/node!./apps/reporting');
        // apps.push('intern/dojo/node!./apps/watcher'); _cluster/health is green instead of expected yellow
      }
      // if (varHashMap.VM === 'centos7_rpm') {
      //   apps.push('intern/dojo/node!./apps/reporting');
      // }

      if (varHashMap.XPACK === 'YES' && ['TRIAL', 'GOLD', 'PLATINUM'].includes(varHashMap.LICENSE)) {

        // we can't test enabling monitoring on this config because we already enable it through cluster settings for both clusters.
        if (varHashMap.VM !== 'ubuntu16_tar_ccs') {
          // monitoring is last because we switch to the elastic superuser here
          apps.push('intern/dojo/node!./apps/monitoring');
        }

        // saml elasticsearch and kibana only listen on localhost on the VM so can't run these remotely
        // if ((varHashMap.VM !== 'ubuntu16_deb_desktop_saml') && (varHashMap.VM !== 'ubuntu18_docker')) {
        //   apps.push('intern/dojo/node!./apps/watcher');
        // }
        // if (varHashMap.VMOS !== 'windows') {
        //   // The reporting_watcher test fails on Windows on Jenkins
        //   // https://github.com/elastic/infra/issues/3810
        //   // PDF Reporting doesn't work on SAML config with Chromium https://github.com/elastic/kibana/issues/23521
        //   // configure_start_kibana sets reporting to phantom on 6.x for this config
        //   apps.push('intern/dojo/node!./apps/reporting');
        // }
      }

      console.log('apps=' + apps.join('\n'));

      require(supportPages.concat(apps), (loadedPageObjects, loadedSupport) => {
        PageObjects = loadedPageObjects;
        support = loadedSupport;
      });
    });

  });
});

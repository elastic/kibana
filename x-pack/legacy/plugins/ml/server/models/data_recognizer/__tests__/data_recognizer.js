/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { DataRecognizer } from '../data_recognizer';

describe('ML - data recognizer', () => {
  const dr = new DataRecognizer({});

  const moduleIds = [
    'apache_ecs',
    'apm_transaction',
    'auditbeat_process_docker_ecs',
    'auditbeat_process_hosts_ecs',
    'logs_ui_analysis',
    'metricbeat_system_ecs',
    'nginx_ecs',
    'sample_data_ecommerce',
    'sample_data_weblogs',
    'siem_auditbeat',
    'siem_auditbeat_auth',
    'siem_packetbeat',
    'siem_winlogbeat',
    'siem_winlogbeat_auth',
  ];

  // check all module IDs are the same as the list above
  it('listModules - check all module IDs', async () => {
    const modules = await dr.listModules();
    const ids = modules.map(m => m.id);
    expect(ids.join()).to.equal(moduleIds.join());
  });

  it('getModule - load a single module', async () => {
    const module = await dr.getModule(moduleIds[0]);
    expect(module.id).to.equal(moduleIds[0]);
  });
});

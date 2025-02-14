/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { reportingPluginMock } from '@kbn/reporting-plugin/public/mocks';
import { spacesPluginMock } from '@kbn/spaces-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';

import { setKibanaServices } from './kibana_services';
import { getId } from '../lib/get_id';
// @ts-expect-error
import { getDefaultWorkpad } from '../state/defaults';

const setDefaultPresentationUtilCapabilities = (core: CoreStart) => {
  core.application.capabilities = {
    ...core.application.capabilities,
    dashboard: {
      show: true,
      createNew: true,
    },
    visualize: {
      save: true,
    },
    advancedSettings: {
      save: true,
    },
  };
};

export const setStubKibanaServices = () => {
  const core: CoreStart = coreMock.createStart();

  setDefaultPresentationUtilCapabilities(core);
  setKibanaServices(
    core,
    {
      charts: chartPluginMock.createStartContract(),
      contentManagement: contentManagementMock.createStartContract(),
      data: dataPluginMock.createStartContract(),
      dataViews: dataViewPluginMocks.createStartContract(),
      embeddable: embeddablePluginMock.createStartContract(),
      expressions: expressionsPluginMock.createStartContract(),
      inspector: inspectorPluginMock.createStartContract(),
      presentationUtil: presentationUtilPluginMock.createStartContract(),
      reporting: reportingPluginMock.createStartContract(),
      spaces: spacesPluginMock.createStartContract(),
      uiActions: uiActionsPluginMock.createStartContract(),
    },
    coreMock.createPluginInitializerContext()
  );
};

const TIMEOUT = 500;

export const getSomeWorkpads = (count = 3, useStaticData = false) => {
  if (useStaticData) {
    const DAY = 86400000;
    const JAN_1_2000 = 946684800000;

    const workpads = [];
    for (let i = 0; i < count; i++) {
      workpads[i] = {
        ...getDefaultWorkpad(),
        name: `Workpad ${i}`,
        id: `workpad-${i}`,
        '@created': moment(JAN_1_2000 + DAY * i).toDate(),
        '@timestamp': moment(JAN_1_2000 + DAY * (i + 1)).toDate(),
      };
    }
    return workpads;
  } else {
    return Array.from({ length: count }, () => ({
      '@created': getRandomDate(
        moment().subtract(3, 'days').toDate(),
        moment().subtract(10, 'days').toDate()
      ),
      '@timestamp': getRandomDate(),
      id: getId('workpad'),
      name: getRandomName(),
    }));
  }
};

export const findSomeWorkpads =
  (count = 3, useStaticData = false, timeout = TIMEOUT) =>
  (_term: string) => {
    return Promise.resolve()
      .then(promiseTimeout(timeout))
      .then(() => ({
        total: count,
        workpads: getSomeWorkpads(count, useStaticData),
      }));
  };

const promiseTimeout = (time: number) => () => new Promise((resolve) => setTimeout(resolve, time));

const getRandomName = () => {
  const lorem =
    'Lorem ipsum dolor sit amet consectetur adipiscing elit Fusce lobortis aliquet arcu ut turpis duis'.split(
      ' '
    );
  return [1, 2, 3].map(() => lorem[Math.floor(Math.random() * lorem.length)]).join(' ');
};

const getRandomDate = (
  start: Date = moment().toDate(),
  end: Date = moment().subtract(7, 'days').toDate()
) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();

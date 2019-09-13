/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_ROUTE } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { notify } from './notify';

const basePath = chrome.getBasePath();
const apiPath = basePath + API_ROUTE;
const savedObjectsClient = chrome.getSavedObjectsClient();
const AdvancedSettings = chrome.getUiSettingsClient();

export const getFields = (index = '_all') => {
  return fetch
    .get(`${apiPath}/es_fields?index=${index}`)
    .then(({ data: mapping }) =>
      Object.keys(mapping)
        .filter(field => !field.startsWith('_')) // filters out meta fields
        .sort()
    )
    .catch(err =>
      notify.error(err, { title: `Couldn't fetch Elasticsearch fields for '${index}'` })
    );
};

export const getIndices = () =>
  savedObjectsClient
    .find({
      type: 'index-pattern',
      fields: ['title'],
      search_fields: ['title'],
      perPage: 1000,
    })
    .then(resp => {
      return resp.savedObjects.map(savedObject => {
        return savedObject.attributes.title;
      });
    })
    .catch(err => notify.error(err, { title: `Couldn't fetch Elasticsearch indices` }));

export const getDefaultIndex = () => {
  const defaultIndexId = AdvancedSettings.get('defaultIndex');

  return defaultIndexId
    ? savedObjectsClient
        .get('index-pattern', defaultIndexId)
        .then(defaultIndex => defaultIndex.attributes.title)
        .catch(err => notify.error(err, { title: `Couldn't fetch default index` }))
    : Promise.resolve('');
};

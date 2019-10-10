/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { API_ROUTE } from '../../common/lib/constants';
// @ts-ignore untyped local
import { fetch } from '../../common/lib/fetch';
import { ErrorStrings } from '../../i18n';
// @ts-ignore untyped local
import { notify } from './notify';

const { esService: strings } = ErrorStrings;

const basePath = chrome.getBasePath();
const apiPath = basePath + API_ROUTE;
const savedObjectsClient = chrome.getSavedObjectsClient();
const AdvancedSettings = chrome.getUiSettingsClient();

export const getFields = (index = '_all') => {
  return fetch
    .get(`${apiPath}/es_fields?index=${index}`)
    .then(({ data: mapping }: { data: object }) =>
      Object.keys(mapping)
        .filter(field => !field.startsWith('_')) // filters out meta fields
        .sort()
    )
    .catch((err: Error) =>
      notify.error(err, {
        title: strings.getFieldsFetchErrorMessage(index),
      })
    );
};

export const getIndices = () =>
  savedObjectsClient
    .find({
      type: 'index-pattern',
      fields: ['title'],
      searchFields: ['title'],
      perPage: 1000,
    })
    .then(resp => {
      return resp.savedObjects.map(savedObject => {
        return savedObject.attributes.title;
      });
    })
    .catch((err: Error) => notify.error(err, { title: strings.getIndicesFetchErrorMessage() }));

export const getDefaultIndex = () => {
  const defaultIndexId = AdvancedSettings.get('defaultIndex');

  return defaultIndexId
    ? savedObjectsClient
        .get('index-pattern', defaultIndexId)
        .then(defaultIndex => defaultIndex.attributes.title)
        .catch(err => notify.error(err, { title: strings.getDefaultIndexFetchErrorMessage() }))
    : Promise.resolve('');
};

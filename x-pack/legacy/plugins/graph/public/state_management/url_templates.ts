/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { i18n } from '@kbn/i18n';
import rison from 'rison-node';
import { GraphState } from './store';
import { UrlTemplate } from '../types';
import { reset } from './global';
import { setDatasource, IndexpatternDatasource, requestDatasource } from './datasource';
import { outlinkEncoders } from '../helpers/outlink_encoders';
import { urlTemplatePlaceholder } from '../helpers/url_template';

const actionCreator = actionCreatorFactory('x-pack/graph/urlTemplates');

export const loadTemplates = actionCreator<UrlTemplate[]>('LOAD_TEMPLATES');
export const saveTemplate = actionCreator<{ index: number; template: UrlTemplate }>(
  'SAVE_TEMPLATE'
);
export const removeTemplate = actionCreator<UrlTemplate>('REMOVE_TEMPLATE');

export type UrlTemplatesState = UrlTemplate[];

const initialTemplates: UrlTemplatesState = [];

function generateDefaultTemplate(
  datasource: IndexpatternDatasource,
  basePath: string
): UrlTemplate {
  const kUrl = new KibanaParsedUrl({
    appId: 'kibana',
    basePath,
    appPath: '/discover',
  });

  kUrl.addQueryParameter(
    '_a',
    rison.encode({
      columns: ['_source'],
      index: datasource.title,
      interval: 'auto',
      query: { language: 'kuery', query: urlTemplatePlaceholder },
      sort: ['_score', 'desc'],
    })
  );

  // replace the URI encoded version of the tag with the unescaped version
  // so it can be found with String.replace, regexp, etc.
  const discoverUrl = kUrl
    .getRootRelativePath()
    .replace(encodeURIComponent(urlTemplatePlaceholder), urlTemplatePlaceholder);

  return {
    url: discoverUrl,
    description: i18n.translate('xpack.graph.settings.drillDowns.defaultUrlTemplateTitle', {
      defaultMessage: 'Raw documents',
    }),
    encoder: outlinkEncoders[0],
    isDefault: true,
    icon: null,
  };
}

export const urlTemplatesReducer = (basePath: string) =>
  reducerWithInitialState(initialTemplates)
    .case(reset, () => initialTemplates)
    .cases([requestDatasource, setDatasource], (templates, datasource) => {
      if (datasource.type === 'none') {
        return initialTemplates;
      }
      const customTemplates = templates.filter(template => !template.isDefault);
      return [...customTemplates, generateDefaultTemplate(datasource, basePath)];
    })
    .case(loadTemplates, (_currentTemplates, newTemplates) => newTemplates)
    .case(saveTemplate, (templates, { index: indexToUpdate, template: updatedTemplate }) => {
      // set default flag to false as soon as template is overwritten.
      const newTemplate = { ...updatedTemplate, isDefault: false };
      return indexToUpdate === -1
        ? [...templates, newTemplate]
        : templates.map((template, index) => (index === indexToUpdate ? newTemplate : template));
    })
    .case(removeTemplate, (templates, templateToDelete) =>
      templates.filter(template => template !== templateToDelete)
    )
    .build();

export const templatesSelector = (state: GraphState) => state.urlTemplates;

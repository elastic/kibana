/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const EMBEDDABLE_HEADER_TITLE = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.embeddableHeaderTitle',
  {
    defaultMessage: 'Network map',
  }
);

export const EMBEDDABLE_HEADER_HELP = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.embeddableHeaderHelp',
  {
    defaultMessage: 'Map configuration help',
  }
);

export const MAP_TITLE = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.embeddablePanelTitle',
  {
    defaultMessage: 'Source -> Destination Point-to-Point Map',
  }
);

export const SOURCE_LAYER = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.sourceLayerLabel',
  {
    defaultMessage: 'Source Point',
  }
);

export const DESTINATION_LAYER = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.destinationLayerLabel',
  {
    defaultMessage: 'Destination Point',
  }
);

export const CLIENT_LAYER = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.clientLayerLabel',
  {
    defaultMessage: 'Client Point',
  }
);

export const SERVER_LAYER = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.serverLayerLabel',
  {
    defaultMessage: 'Server Point',
  }
);

export const LINE_LAYER = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.lineLayerLabel',
  {
    defaultMessage: 'Line',
  }
);

export const ERROR_CONFIGURING_EMBEDDABLES_API = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.errorConfiguringEmbeddableApiTitle',
  {
    defaultMessage: 'Error configuring Embeddables API',
  }
);

export const ERROR_CREATING_EMBEDDABLE = i18n.translate(
  'xpack.siem.components.embeddables.embeddedMap.errorCreatingMapEmbeddableTitle',
  {
    defaultMessage: 'Error creating Map Embeddable',
  }
);

export const ERROR_TITLE = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorTitle',
  {
    defaultMessage: 'Required index patterns not configured',
  }
);

export const ERROR_BUTTON = i18n.translate(
  'xpack.siem.components.embeddables.indexPatternsMissingPrompt.errorButtonLabel',
  {
    defaultMessage: 'Configure index patterns',
  }
);

export const FILTER_FOR_VALUE = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.filterForValueHoverAction',
  {
    defaultMessage: 'Filter for value',
  }
);

export const MAP_TOOL_TIP_ERROR = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.errorTitle',
  {
    defaultMessage: 'Error loading map features',
  }
);

export const MAP_TOOL_TIP_FEATURES_FOOTER = (currentFeature: number, totalFeatures: number) =>
  i18n.translate('xpack.siem.components.embeddables.mapToolTip.footerLabel', {
    values: { currentFeature, totalFeatures },
    defaultMessage:
      '{currentFeature} of {totalFeatures} {totalFeatures, plural, =1 {feature} other {features}}',
  });

export const HOST = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.hostTitle',
  {
    defaultMessage: 'Host',
  }
);

export const SOURCE_IP = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.sourceIPTitle',
  {
    defaultMessage: 'Source IP',
  }
);

export const DESTINATION_IP = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.destinationIPTitle',
  {
    defaultMessage: 'Destination IP',
  }
);

export const CLIENT_IP = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.clientIPTitle',
  {
    defaultMessage: 'Client IP',
  }
);

export const SERVER_IP = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.serverIPTitle',
  {
    defaultMessage: 'Server IP',
  }
);

export const SOURCE_DOMAIN = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.sourceDomainTitle',
  {
    defaultMessage: 'Source domain',
  }
);

export const DESTINATION_DOMAIN = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.destinationDomainTitle',
  {
    defaultMessage: 'Destination domain',
  }
);

export const CLIENT_DOMAIN = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.clientDomainTitle',
  {
    defaultMessage: 'Client domain',
  }
);

export const SERVER_DOMAIN = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.serverDomainTitle',
  {
    defaultMessage: 'Server domain',
  }
);

export const LOCATION = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.locationTitle',
  {
    defaultMessage: 'Location',
  }
);

export const ASN = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.pointContent.asnTitle',
  {
    defaultMessage: 'ASN',
  }
);

export const SOURCE = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.lineContent.sourceLabel',
  {
    defaultMessage: 'Source',
  }
);

export const DESTINATION = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.lineContent.destinationLabel',
  {
    defaultMessage: 'Destination',
  }
);

export const CLIENT = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.lineContent.clientLabel',
  {
    defaultMessage: 'Client',
  }
);

export const SERVER = i18n.translate(
  'xpack.siem.components.embeddables.mapToolTip.lineContent.serverLabel',
  {
    defaultMessage: 'Server',
  }
);

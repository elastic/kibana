/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';

export interface GenericIcon {
  label: string;
  patterns?: RegExp[];
  id: string;
  package: 'maki' | 'eui';
  prevName: string;
}

export const iconChoices: GenericIcon[] = [
  {
    id: 'folderOpen',
    prevName: 'fa-folder-open-o',
    package: 'eui',
    patterns: [/category/i, /folder/i, /group/i],
    label: i18n.translate('xpack.graph.icon.folderOpen', { defaultMessage: 'Folder open' }),
  },
  {
    id: 'kubernetesPod',
    prevName: 'fa-cube',
    package: 'eui',
    patterns: [/prod/i, /sku/i],
    label: i18n.translate('xpack.graph.icon.cube', { defaultMessage: 'Cube' }),
  },
  {
    id: 'key',
    prevName: 'fa-key',
    package: 'eui',
    patterns: [/key/i],
    label: i18n.translate('xpack.graph.icon.key', { defaultMessage: 'Key' }),
  },
  {
    id: 'town_hall',
    prevName: 'fa-bank',
    package: 'maki',
    patterns: [/bank/i, /account/i],
    label: i18n.translate('xpack.graph.icon.bank', { defaultMessage: 'Bank' }),
  },
  {
    id: 'car',
    prevName: 'fa-automobile',
    package: 'maki',
    patterns: [/car/i, /veh/i],
    label: i18n.translate('xpack.graph.icon.automobile', { defaultMessage: 'Automobile' }),
  },
  {
    id: 'home',
    prevName: 'fa-home',
    package: 'eui',
    patterns: [/address/i, /home/i],
    label: i18n.translate('xpack.graph.icon.home', { defaultMessage: 'Home' }),
  },
  {
    id: 'questionInCircle',
    prevName: 'fa-question',
    package: 'eui',
    patterns: [/query/i, /search/i],
    label: i18n.translate('xpack.graph.icon.question', { defaultMessage: 'Question' }),
  },
  {
    id: 'airport',
    prevName: 'fa-plane',
    package: 'maki',
    patterns: [/flight/i, /plane/i],
    label: i18n.translate('xpack.graph.icon.plane', { defaultMessage: 'Plane' }),
  },
  {
    id: 'document',
    prevName: 'fa-file-o',
    package: 'eui',
    patterns: [/file/i, /doc/i],
    label: i18n.translate('xpack.graph.icon.file', { defaultMessage: 'File open' }),
  },
  {
    id: 'user',
    prevName: 'fa-user',
    package: 'eui',
    patterns: [
      /user/i,
      /person/i,
      /people/i,
      /owner/i,
      /cust/i,
      /participant/i,
      /party/i,
      /member/i,
    ],
    label: i18n.translate('xpack.graph.icon.user', { defaultMessage: 'User' }),
  },
  {
    id: 'users',
    prevName: 'fa-users',
    package: 'eui',
    patterns: [/group/i, /team/i, /meeting/i],
    label: i18n.translate('xpack.graph.icon.users', { defaultMessage: 'Users' }),
  },
  {
    id: 'music',
    prevName: 'fa-music',
    package: 'maki',
    patterns: [/artist/i, /sound/i, /music/i],
    label: i18n.translate('xpack.graph.icon.music', { defaultMessage: 'Music' }),
  },
  {
    id: 'flag',
    prevName: 'fa-flag',
    package: 'eui',
    patterns: [/country/i, /warn/i, /flag/i],
    label: i18n.translate('xpack.graph.icon.flag', { defaultMessage: 'Flag' }),
  },
  {
    id: 'tag',
    prevName: 'fa-flag',
    package: 'eui',
    patterns: [/tag/i, /label/i],
    label: 'Tag',
  },
  {
    id: 'telephone',
    prevName: 'fa-phone',
    package: 'maki',
    patterns: [/phone/i],
    label: i18n.translate('xpack.graph.icon.phone', { defaultMessage: 'Phone' }),
  },
  {
    id: 'desktop',
    prevName: 'fa-desktop',
    package: 'eui',
    patterns: [/host/i, /server/i],
    label: i18n.translate('xpack.graph.icon.desktop', { defaultMessage: 'Desktop' }),
  },
  {
    id: 'lettering',
    prevName: 'fa-font',
    package: 'eui',
    patterns: [/text/i, /title/i, /body/i, /desc/i],
    label: i18n.translate('xpack.graph.icon.font', { defaultMessage: 'Font' }),
  },
  {
    id: 'at',
    prevName: 'fa-at',
    package: 'eui',
    patterns: [/account/i, /email/i],
    label: i18n.translate('xpack.graph.icon.at', { defaultMessage: 'At' }),
  },
  {
    id: 'heart',
    prevName: 'fa-heart',
    package: 'eui',
    patterns: [/like/i, /favourite/i, /favorite/i],
    label: i18n.translate('xpack.graph.icon.heart', { defaultMessage: 'Heart' }),
  },
  {
    id: 'bolt',
    prevName: 'fa-bolt',
    package: 'eui',
    patterns: [/action/i],
    label: i18n.translate('xpack.graph.icon.bolt', { defaultMessage: 'Bolt' }),
  },
  {
    id: 'mapMarker',
    prevName: 'fa-map-marker',
    package: 'eui',
    patterns: [/location/i, /geo/i, /position/i],
    label: i18n.translate('xpack.graph.icon.mapMarker', { defaultMessage: 'Map marker' }),
  },
  {
    id: 'warning',
    prevName: 'fa-exclamation',
    package: 'eui',
    patterns: [/risk/i, /error/i, /warn/i],
    label: i18n.translate('xpack.graph.icon.exclamation', { defaultMessage: 'Exclamation' }),
  },
  {
    id: 'industry',
    prevName: 'fa-industry',
    package: 'maki',
    patterns: [/business/i, /company/i, /industry/i, /organisation/i],
    label: i18n.translate('xpack.graph.icon.industry', { defaultMessage: 'Industry' }),
  },
];

export interface FontawesomeIcon {
  class: string;
  code: string;
  patterns?: RegExp[];
  label: string;
}

export const getSuitableIcon = (fieldName: string): GenericIcon =>
  iconChoices.find((choice) => choice.patterns?.some((pattern) => pattern.test(fieldName))) ||
  iconChoices[0];

export const iconChoicesByClass: Partial<Record<string, GenericIcon>> = {};

iconChoices.forEach((icon) => {
  iconChoicesByClass[icon.id] = icon;
});

export const urlTemplateIconChoices: GenericIcon[] = [
  // Patterns are used to help default icon choices for common field names
  {
    id: 'visLine',
    prevName: 'fa-line-chart',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.lineChart', { defaultMessage: 'Line chart' }),
  },
  {
    id: 'visPie',
    prevName: 'fa-pie-chart',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.pieChart', { defaultMessage: 'Pie chart' }),
  },
  {
    id: 'visArea',
    prevName: 'fa-area-chart',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.areaChart', { defaultMessage: 'Area chart' }),
  },
  {
    id: 'visBarVertical',
    prevName: 'fa-bar-chart',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.barChart', { defaultMessage: 'Bar chart' }),
  },
  {
    id: 'globe',
    prevName: 'fa-globe',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.globe', { defaultMessage: 'Globe' }),
  },
  {
    id: 'document',
    prevName: 'fa-file-text-o',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.fileText', { defaultMessage: 'File' }),
  },
  {
    id: 'search',
    prevName: 'fa-google',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.search', { defaultMessage: 'Search' }),
  },
  {
    id: 'eye',
    prevName: 'fa-eye',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.eye', { defaultMessage: 'Eye' }),
  },
  {
    id: 'visGauge',
    prevName: 'fa-tachimeter',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.tachometer', { defaultMessage: 'Tachometer' }),
  },
  {
    id: 'iInCircle',
    prevName: 'fa-info',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.info', { defaultMessage: 'Info' }),
  },
  {
    id: 'link',
    prevName: 'fa-external-link',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.externalLink', { defaultMessage: 'External link' }),
  },
  {
    id: 'visTable',
    prevName: 'fa-table',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.table', { defaultMessage: 'Table' }),
  },
  {
    id: 'list',
    prevName: 'fa-list',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.list', { defaultMessage: 'List' }),
  },
  {
    id: 'cluster',
    prevName: 'fa-share-alt',
    package: 'eui',
    label: i18n.translate('xpack.graph.icon.shareAlt', { defaultMessage: 'Share' }),
  },
];

export const urlTemplateIconChoicesByClass: Partial<Record<string, GenericIcon>> = {};

urlTemplateIconChoices.forEach((icon) => {
  urlTemplateIconChoicesByClass[icon.id] = icon;
});

export const colorChoices = euiPaletteColorBlind();

type AnyIconType = FontawesomeIcon | GenericIcon | string;

function hasIcon(icon: AnyIconType | undefined): icon is AnyIconType {
  return icon != null;
}

export function isNewIcon(icon: AnyIconType | undefined): icon is GenericIcon {
  if (!hasIcon(icon)) {
    return false;
  }
  return typeof icon !== 'string' ? 'package' in icon : iconChoices.some(({ id }) => id === icon);
}

export function getIcon(icon: AnyIconType): GenericIcon {
  if (isNewIcon(icon)) {
    return typeof icon === 'string' ? iconChoicesByClass[icon]! : icon;
  }
  return getIconFromList(icon, iconChoices);
}

export function getTemplateIcon(icon: AnyIconType): GenericIcon {
  if (isNewIcon(icon)) {
    return typeof icon === 'string' ? urlTemplateIconChoicesByClass[icon]! : icon;
  }
  return getIconFromList(icon, urlTemplateIconChoices);
}

const EMPTY_ICON: GenericIcon = {
  id: 'empty',
  prevName: '',
  package: 'eui',
  label: i18n.translate('xpack.graph.icon.empty', { defaultMessage: 'Empty icon' }),
};

function getIconFromList(
  icon: Exclude<AnyIconType, GenericIcon>,
  list: GenericIcon[]
): GenericIcon {
  if (!hasIcon(icon)) {
    return EMPTY_ICON;
  }
  const iconName = typeof icon === 'string' ? icon : icon.class;
  const newIcon = list.find(({ prevName }) => prevName === iconName);
  return newIcon ?? EMPTY_ICON;
}

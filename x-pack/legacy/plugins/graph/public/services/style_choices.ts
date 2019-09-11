/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface FontawesomeIcon {
  class: string;
  code: string;
  patterns?: RegExp[];
  label: string;
}

// TODO i18n the labels

export const iconChoices = [
  // Patterns are used to help default icon choices for common field names
  {
    class: 'fa-folder-open-o',
    code: '\uf115',
    patterns: [/category/i, /folder/i, /group/i],
    label: 'folder open',
  },
  {
    class: 'fa-cube',
    code: '\uf1b2',
    patterns: [/prod/i, /sku/i],
    label: 'cube',
  },
  {
    class: 'fa-key',
    code: '\uf084',
    patterns: [/key/i],
    label: 'key',
  },
  {
    class: 'fa-bank',
    code: '\uf19c',
    patterns: [/bank/i, /account/i],
    label: 'bank',
  },
  {
    class: 'fa-automobile',
    code: '\uf1b9',
    patterns: [/car/i, /veh/i],
    label: 'automobile',
  },
  {
    class: 'fa-home',
    code: '\uf015',
    patterns: [/address/i, /home/i],
    label: 'home',
  },
  {
    class: 'fa-question',
    code: '\uf128',
    patterns: [/query/i, /search/i],
    label: 'question',
  },
  {
    class: 'fa-plane',
    code: '\uf072',
    patterns: [/flight/i, /plane/i],
    label: 'plane',
  },
  {
    class: 'fa-file-o',
    code: '\uf016',
    patterns: [/file/i, /doc/i],
    label: 'file open',
  },
  {
    class: 'fa-user',
    code: '\uf007',
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
    label: 'user',
  },
  {
    class: 'fa-users',
    code: '\uf0c0',
    patterns: [/group/i, /team/i, /meeting/i],
    label: 'users',
  },
  {
    class: 'fa-music',
    code: '\uf001',
    patterns: [/artist/i, /sound/i, /music/i],
    label: 'music',
  },
  {
    class: 'fa-flag',
    code: '\uf024',
    patterns: [/country/i, /warn/i, /flag/i],
    label: 'flag',
  },
  {
    class: 'fa-tag',
    code: '\uf02b',
    patterns: [/tag/i, /label/i],
    label: 'tag',
  },
  {
    class: 'fa-phone',
    code: '\uf095',
    patterns: [/phone/i],
    label: 'phone',
  },
  {
    class: 'fa-desktop',
    code: '\uf108',
    patterns: [/host/i, /server/i],
    label: 'desktop',
  },
  {
    class: 'fa-font',
    code: '\uf031',
    patterns: [/text/i, /title/i, /body/i, /desc/i],
    label: 'font',
  },
  {
    class: 'fa-at',
    code: '\uf1fa',
    patterns: [/account/i, /email/i],
    label: 'at',
  },
  {
    class: 'fa-heart',
    code: '\uf004',
    patterns: [/like/i, /favourite/i, /favorite/i],
    label: 'heart',
  },
  {
    class: 'fa-bolt',
    code: '\uf0e7',
    patterns: [/action/i],
    label: 'bolt',
  },
  {
    class: 'fa-map-marker',
    code: '\uf041',
    patterns: [/location/i, /geo/i, /position/i],
    label: 'map marker',
  },
  {
    class: 'fa-exclamation',
    code: '\uf12a',
    patterns: [/risk/i, /error/i, /warn/i],
    label: 'exclamation',
  },
  {
    class: 'fa-industry',
    code: '\uf275',
    patterns: [/business/i, /company/i, /industry/i, /organisation/i],
    label: 'industry',
  },
];

export const getSuitableIcon = (fieldName: string) =>
  iconChoices.find(choice => choice.patterns.some(pattern => pattern.test(fieldName))) ||
  iconChoices[0];

export const iconChoicesByClass: Partial<Record<string, FontawesomeIcon>> = {};

iconChoices.forEach(icon => {
  iconChoicesByClass[icon.class] = icon;
});

export const urlTemplateIconChoices = [
  // Patterns are used to help default icon choices for common field names
  {
    class: 'fa-line-chart',
    code: '\uf201',
    label: 'line chart',
  },
  {
    class: 'fa-pie-chart',
    code: '\uf200',
    label: 'pie chart',
  },
  {
    class: 'fa-area-chart',
    code: '\uf1fe',
    label: 'area chart',
  },
  {
    class: 'fa-bar-chart',
    code: '\uf080',
    label: 'bar chart',
  },
  {
    class: 'fa-globe',
    code: '\uf0ac',
    label: 'globe',
  },
  {
    class: 'fa-file-text-o',
    code: '\uf0f6',
    label: 'file-text-o',
  },
  {
    class: 'fa-google',
    code: '\uf1a0',
    label: 'google',
  },
  {
    class: 'fa-eye',
    code: '\uf06e',
    label: 'eye',
  },
  {
    class: 'fa-tachometer',
    code: '\uf0e4',
    label: 'tachometer',
  },
  {
    class: 'fa-info',
    code: '\uf129',
    label: 'info',
  },
  {
    class: 'fa-external-link',
    code: '\uf08e',
    label: 'external-link',
  },
  {
    class: 'fa-table',
    code: '\uf0ce',
    label: 'table',
  },
  {
    class: 'fa-list',
    code: '\uf03a',
    label: 'list',
  },
  {
    class: 'fa-share-alt',
    code: '\uf1e0',
    label: 'share-alt',
  },
];
export const urlTemplateIconChoicesByClass: Partial<Record<string, FontawesomeIcon>> = {};

urlTemplateIconChoices.forEach(icon => {
  urlTemplateIconChoicesByClass[icon.class] = icon;
});

export const colorChoices = [
  '#99bde7',
  '#e3d754',
  '#8ee684',
  '#e7974c',
  '#e4878d',
  '#67adab',
  '#43ebcc',
  '#e4b4ea',
  '#a1a655',
  '#78b36e',
];

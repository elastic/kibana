/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

const USE_KIBANA_LOCALE_SETTING = 'Use Kibana locale setting';
const USE_BROWSER_LANGUAGE_SETTING = 'Use browser language setting';

const SPECIAL_OPTIONS = [
  {
    label: USE_KIBANA_LOCALE_SETTING,
  },
  {
    label: USE_BROWSER_LANGUAGE_SETTING,
  },
];

/* eslint-disable @typescript-eslint/naming-convention */
// Data taken from https://github.com/L-P/native-language-list/blob/master/data/langs.json
const languages: { [key: string]: string } = {
  af: 'Afrikaans',
  ak: 'Akan',
  am: '\u12a0\u121b\u122d\u129b',
  ar: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629',
  as: '\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be',
  az: 'az\u0259rbaycan',
  be: '\u0431\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f',
  bg: '\u0431\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438',
  bm: 'bamanakan',
  bn: '\u09ac\u09be\u0982\u09b2\u09be',
  bo: '\u0f56\u0f7c\u0f51\u0f0b\u0f66\u0f90\u0f51\u0f0b',
  br: 'brezhoneg',
  bs: 'bosanski',
  ca: 'catal\u00e0',
  cs: '\u010de\u0161tina',
  cy: 'Cymraeg',
  da: 'dansk',
  de: 'Deutsch',
  de_AT: '\u00d6sterreichisches Deutsch',
  de_CH: 'Schweizer Hochdeutsch',
  dz: '\u0f62\u0fab\u0f7c\u0f44\u0f0b\u0f41',
  ee: 'e\u028begbe',
  el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac',
  en: 'English',
  en_AU: 'Australian English',
  en_CA: 'Canadian English',
  en_GB: 'British English',
  en_US: 'American English',
  eo: 'esperanto',
  es: 'espa\u00f1ol',
  es_ES: 'espa\u00f1ol de Espa\u00f1a',
  es_MX: 'espa\u00f1ol de M\u00e9xico',
  et: 'eesti',
  eu: 'euskara',
  fa: '\u0641\u0627\u0631\u0633\u06cc',
  ff: 'Pulaar',
  fi: 'suomi',
  fo: 'f\u00f8royskt',
  fr: 'fran\u00e7ais',
  fr_CA: 'fran\u00e7ais canadien',
  fr_CH: 'fran\u00e7ais suisse',
  fy: 'West-Frysk',
  ga: 'Gaeilge',
  gd: 'G\u00e0idhlig',
  gl: 'galego',
  gu: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0',
  gv: 'Gaelg',
  ha: 'Hausa',
  he: '\u05e2\u05d1\u05e8\u05d9\u05ea',
  hi: '\u0939\u093f\u0902\u0926\u0940',
  hr: 'hrvatski',
  hu: 'magyar',
  hy: '\u0570\u0561\u0575\u0565\u0580\u0565\u0576',
  id: 'Bahasa Indonesia',
  ig: 'Igbo',
  ii: '\ua188\ua320\ua259',
  is: '\u00edslenska',
  it: 'italiano',
  ja: '\u65e5\u672c\u8a9e',
  ka: '\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8',
  ki: 'Gikuyu',
  kk: '\u049b\u0430\u0437\u0430\u049b \u0442\u0456\u043b\u0456',
  kl: 'kalaallisut',
  km: '\u1781\u17d2\u1798\u17c2\u179a',
  kn: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1',
  ko: '\ud55c\uad6d\uc5b4',
  ks: '\u06a9\u0672\u0634\u064f\u0631',
  kw: 'kernewek',
  ky: '\u043a\u044b\u0440\u0433\u044b\u0437\u0447\u0430',
  lb: 'L\u00ebtzebuergesch',
  lg: 'Luganda',
  ln: 'ling\u00e1la',
  lo: '\u0ea5\u0eb2\u0ea7',
  lt: 'lietuvi\u0173',
  lu: 'Tshiluba',
  lv: 'latvie\u0161u',
  mg: 'Malagasy',
  mk: '\u043c\u0430\u043a\u0435\u0434\u043e\u043d\u0441\u043a\u0438',
  ml: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02',
  mn: '\u043c\u043e\u043d\u0433\u043e\u043b',
  mr: '\u092e\u0930\u093e\u0920\u0940',
  ms: 'Bahasa Melayu',
  mt: 'Malti',
  my: '\u1017\u1019\u102c',
  nb: 'norsk bokm\u00e5l',
  nd: 'isiNdebele',
  ne: '\u0928\u0947\u092a\u093e\u0932\u0940',
  nl: 'Nederlands',
  nl_BE: 'Vlaams',
  nn: 'nynorsk',
  no: 'norsk',
  om: 'Oromoo',
  or: '\u0b13\u0b21\u0b3c\u0b3f\u0b06',
  os: '\u0438\u0440\u043e\u043d',
  pa: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40',
  pl: 'polski',
  ps: '\u067e\u069a\u062a\u0648',
  pt: 'portugu\u00eas',
  pt_BR: 'portugu\u00eas do Brasil',
  pt_PT: 'portugu\u00eas europeu',
  qu: 'Runasimi',
  rm: 'rumantsch',
  rn: 'Ikirundi',
  ro: 'rom\u00e2n\u0103',
  ro_MD: 'moldoveneasc\u0103',
  ru: '\u0440\u0443\u0441\u0441\u043a\u0438\u0439',
  rw: 'Kinyarwanda',
  se: 'davvis\u00e1megiella',
  sg: 'S\u00e4ng\u00f6',
  sh: 'Srpskohrvatski',
  si: '\u0dc3\u0dd2\u0d82\u0dc4\u0dbd',
  sk: 'sloven\u010dina',
  sl: 'sloven\u0161\u010dina',
  sn: 'chiShona',
  so: 'Soomaali',
  sq: 'shqip',
  sr: '\u0441\u0440\u043f\u0441\u043a\u0438',
  sv: 'svenska',
  sw: 'Kiswahili',
  ta: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd',
  te: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41',
  th: '\u0e44\u0e17\u0e22',
  ti: '\u1275\u130d\u122d\u129b',
  tl: 'Tagalog',
  to: 'lea fakatonga',
  tr: 'T\u00fcrk\u00e7e',
  ug: '\u0626\u06c7\u064a\u063a\u06c7\u0631\u0686\u06d5',
  uk: '\u0443\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430',
  ur: '\u0627\u0631\u062f\u0648',
  uz: 'o\u02bbzbekcha',
  vi: 'Ti\u1ebfng Vi\u1ec7t',
  yi: '\u05d9\u05d9\u05b4\u05d3\u05d9\u05e9',
  yo: '\u00c8d\u00e8 Yor\u00f9b\u00e1',
  zh: '\u4e2d\u6587',
  zh_Hans: '\u7b80\u4f53\u4e2d\u6587',
  zh_Hant: '\u7e41\u9ad4\u4e2d\u6587',
  zu: 'isiZulu',
};

const LANGUAGE_OPTIONS = SPECIAL_OPTIONS.concat(
  Object.values(languages).map((language) => ({
    label: language,
  }))
);

export type UseUserPreferredLanguageResult = ReturnType<typeof useUserPreferredLanguage>;

export const SELECTED_LANGUAGE_LOCAL_STORAGE_KEY =
  'xpack.observabilityAiAssistant.responseLanguage';

export function useUserPreferredLanguage() {
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage(
    SELECTED_LANGUAGE_LOCAL_STORAGE_KEY,
    USE_KIBANA_LOCALE_SETTING
  );

  const getPreferredLanguage = useCallback(() => {
    if (selectedLanguage === USE_KIBANA_LOCALE_SETTING) {
      return getLanguageFromKibanaSettings();
    } else if (selectedLanguage === USE_BROWSER_LANGUAGE_SETTING) {
      return getLanguageFromBrowserSetting();
    } else {
      return selectedLanguage || 'English';
    }
  }, [selectedLanguage]);

  return {
    selectedLanguage,
    setSelectedLanguage,
    LANGUAGE_OPTIONS,
    getPreferredLanguage,
  };
}

function getLanguageFromKibanaSettings() {
  switch (i18n.getLocale()) {
    case 'en':
      return 'English';
    case 'zh-cn':
      return '简体中文';
    case 'ja-jp':
      return '日本語';
    case 'fr-fr':
      return 'français';
    default:
      return 'English';
  }
}

function getLanguageFromBrowserSetting() {
  return languages[navigator.language] || 'English';
}

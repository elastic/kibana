/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IAC_LANGUAGES, NON_APP_LANGUAGES } from './constants';
import type { LanguageCount, RepoClassification, RepoType } from './types';

const normalizeLanguage = (language: string): string => language.trim().toLowerCase();

/**
 * Precomputed, deterministic repository classification from a language
 * histogram. A repository is `iac` when it contains IaC languages, `app` when
 * it contains programming languages, and `both` when it contains both.
 *
 * The primary application language is the highest-volume non-IaC, non-markup
 * language, used to emit a `language` Feature KI.
 */
export function classifyRepository(languageHistogram: LanguageCount[]): RepoClassification {
  const languages: LanguageCount[] = languageHistogram
    .map(({ language, count }) => ({ language: normalizeLanguage(language), count }))
    .filter(({ language }) => language.length > 0);

  const isIac = languages.some(({ language }) => IAC_LANGUAGES.has(language));
  const appLanguages = languages
    .filter(({ language }) => !NON_APP_LANGUAGES.has(language))
    .sort((a, b) => b.count - a.count);
  const isApp = appLanguages.length > 0;

  const repoType: RepoType = isApp && isIac ? 'both' : isIac ? 'iac' : 'app';

  return {
    repoType,
    isApp,
    isIac,
    primaryLanguage: appLanguages[0]?.language,
    languages,
  };
}

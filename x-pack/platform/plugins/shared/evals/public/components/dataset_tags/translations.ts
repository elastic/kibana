/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TAGS_LABEL = i18n.translate('xpack.evals.datasetTags.tagsLabel', {
  defaultMessage: 'Tags',
});

export const MATURITY_LABEL = i18n.translate('xpack.evals.datasetTags.maturityLabel', {
  defaultMessage: 'Maturity',
});

export const MATURITY_RAW = i18n.translate('xpack.evals.datasetTags.maturity.raw', {
  defaultMessage: 'Raw',
});

export const MATURITY_CLEANED = i18n.translate('xpack.evals.datasetTags.maturity.cleaned', {
  defaultMessage: 'Cleaned',
});

export const MATURITY_GOLDEN = i18n.translate('xpack.evals.datasetTags.maturity.golden', {
  defaultMessage: 'Golden',
});

export const MATURITY_NONE_OPTION = i18n.translate('xpack.evals.datasetTags.maturityNoneOption', {
  defaultMessage: 'Not set',
});

export const MATURITY_HELP_TEXT = i18n.translate('xpack.evals.datasetTags.maturityHelpText', {
  defaultMessage: 'How curated this dataset is. Golden datasets are treated as references.',
});

export const TAGS_HELP_TEXT = i18n.translate('xpack.evals.datasetTags.tagsHelpText', {
  defaultMessage:
    'Press Enter to add a tag. Tags are lowercased, and can contain letters, numbers, and the characters : . _ -',
});

export const TAGS_PLACEHOLDER = i18n.translate('xpack.evals.datasetTags.tagsPlaceholder', {
  defaultMessage: 'Add tags',
});

export const ADD_TAG_CUSTOM_OPTION = i18n.translate('xpack.evals.datasetTags.addTagCustomOption', {
  defaultMessage: 'Add {searchValue} as a tag',
  values: { searchValue: '{searchValue}' },
});

export const getInvalidTagError = (tag: string) =>
  i18n.translate('xpack.evals.datasetTags.invalidTagError', {
    defaultMessage:
      '"{tag}" is not a valid tag. Start with a letter or number, and use only letters, numbers, and : . _ -',
    values: { tag },
  });

export const getTooManyTagsError = (max: number) =>
  i18n.translate('xpack.evals.datasetTags.tooManyTagsError', {
    defaultMessage: 'A dataset can have at most {max, plural, one {# tag} other {# tags}}.',
    values: { max },
  });

export const getMoreTagsLabel = (count: number) =>
  i18n.translate('xpack.evals.datasetTags.moreTagsLabel', {
    defaultMessage: '+{count} more',
    values: { count },
  });

export const getFilterByTagAriaLabel = (tag: string) =>
  i18n.translate('xpack.evals.datasetTags.filterByTagAriaLabel', {
    defaultMessage: 'Filter by tag {tag}',
    values: { tag },
  });

export const TAGS_FILTER_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.evals.datasetTags.tagsFilterSearchPlaceholder',
  {
    defaultMessage: 'Search tags',
  }
);

export const FILTER_BY_TAGS = i18n.translate('xpack.evals.datasetTags.filterByTags', {
  defaultMessage: 'Filter by tags',
});

export const FILTER_BY_MATURITY = i18n.translate('xpack.evals.datasetTags.filterByMaturity', {
  defaultMessage: 'Filter by maturity',
});

export const NO_TAGS_TO_FILTER_BY = i18n.translate('xpack.evals.datasetTags.noTagsToFilterBy', {
  defaultMessage: 'No tags yet',
});

export const NO_MATURITY_TO_FILTER_BY = i18n.translate(
  'xpack.evals.datasetTags.noMaturityToFilterBy',
  {
    defaultMessage: 'No maturity levels set yet',
  }
);

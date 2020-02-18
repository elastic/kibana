/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

interface Optioni18n {
  title: string;
  description: string;
}

type IndexOptions =
  | 'indexOptions.docs'
  | 'indexOptions.freqs'
  | 'indexOptions.positions'
  | 'indexOptions.offsets';

type AnalyzerOptions =
  | 'analyzer.indexDefault'
  | 'analyzer.standard'
  | 'analyzer.simple'
  | 'analyzer.whitespace'
  | 'analyzer.stop'
  | 'analyzer.keyword'
  | 'analyzer.pattern'
  | 'analyzer.fingerprint'
  | 'analyzer.language';

type SimilarityOptions = 'similarity.bm25' | 'similarity.boolean';

type TermVectorOptions =
  | 'termVector.no'
  | 'termVector.yes'
  | 'termVector.withPositions'
  | 'termVector.withOffsets'
  | 'termVector.withPositionsOffsets'
  | 'termVector.withPositionsPayloads'
  | 'termVector.withPositionsOffsetsPayloads';

type OrientationOptions = 'orientation.counterclockwise' | 'orientation.clockwise';

type LanguageAnalyzerOption =
  | 'arabic'
  | 'armenian'
  | 'basque'
  | 'bengali'
  | 'brazilian'
  | 'bulgarian'
  | 'catalan'
  | 'cjk'
  | 'czech'
  | 'danish'
  | 'dutch'
  | 'english'
  | 'finnish'
  | 'french'
  | 'galician'
  | 'german'
  | 'greek'
  | 'hindi'
  | 'hungarian'
  | 'indonesian'
  | 'irish'
  | 'italian'
  | 'latvian'
  | 'lithuanian'
  | 'norwegian'
  | 'persian'
  | 'portuguese'
  | 'romanian'
  | 'russian'
  | 'sorani'
  | 'spanish'
  | 'swedish'
  | 'turkish'
  | 'thai';

export type FieldOption =
  | IndexOptions
  | AnalyzerOptions
  | SimilarityOptions
  | TermVectorOptions
  | OrientationOptions;

export const FIELD_OPTIONS_TEXTS: { [key in FieldOption]: Optioni18n } = {
  'indexOptions.docs': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.docNumberTitle', {
      defaultMessage: 'Doc number',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.docNumberDescription',
      {
        defaultMessage:
          'Index the doc number only. Used to verify the existence of a term in a field.',
      }
    ),
  },
  'indexOptions.freqs': {
    title: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.termFrequencyTitle',
      {
        defaultMessage: 'Term frequencies',
      }
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.termFrequencyDescription',
      {
        defaultMessage:
          'Index the doc number and term frequencies. Repeated terms score higher than single terms.',
      }
    ),
  },
  'indexOptions.positions': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.positionsTitle', {
      defaultMessage: 'Positions',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.positionsDescription',
      {
        defaultMessage:
          'Index the doc number, term frequencies, positions, and start and end character offsets. Offsets map the term back to the original string.',
      }
    ),
  },
  'indexOptions.offsets': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.offsetsTitle', {
      defaultMessage: 'Offsets',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.indexOptions.offsetsDescription',
      {
        defaultMessage:
          'Doc number, term frequencies, positions, and start and end character offsets (which map the term back to the original string) are indexed.',
      }
    ),
  },
  'analyzer.indexDefault': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.indexDefaultTitle', {
      defaultMessage: 'Index default',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.indexDefaultDescription',
      {
        defaultMessage: 'Use the analyzer defined for the index.',
      }
    ),
  },
  'analyzer.standard': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.standardTitle', {
      defaultMessage: 'Standard',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.standardDescription',
      {
        defaultMessage:
          'The standard analyzer divides text into terms on word boundaries, as defined by the Unicode Text Segmentation algorithm.',
      }
    ),
  },
  'analyzer.simple': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.simpleTitle', {
      defaultMessage: 'Simple',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.simpleDescription',
      {
        defaultMessage:
          'The simple analyzer divides text into terms whenever it encounters a character which is not a letter. ',
      }
    ),
  },
  'analyzer.whitespace': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.whitespaceTitle', {
      defaultMessage: 'Whitespace',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.whitespaceDescription',
      {
        defaultMessage:
          'The whitespace analyzer divides text into terms whenever it encounters any whitespace character.',
      }
    ),
  },
  'analyzer.stop': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.stopTitle', {
      defaultMessage: 'Stop',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.stopDescription',
      {
        defaultMessage:
          'The stop analyzer is like the simple analyzer, but also supports removal of stop words.',
      }
    ),
  },
  'analyzer.keyword': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.keywordTitle', {
      defaultMessage: 'Keyword',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.keywordDescription',
      {
        defaultMessage:
          'The keyword analyzer is a “noop” analyzer that accepts whatever text it is given and outputs the exact same text as a single term.',
      }
    ),
  },
  'analyzer.pattern': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.patternTitle', {
      defaultMessage: 'Pattern',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.patternDescription',
      {
        defaultMessage:
          'The pattern analyzer uses a regular expression to split the text into terms. It supports lower-casing and stop words.',
      }
    ),
  },
  'analyzer.fingerprint': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.fingerprintTitle', {
      defaultMessage: 'Fingerprint',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.fingerprintDescription',
      {
        defaultMessage:
          'The fingerprint analyzer is a specialist analyzer which creates a fingerprint which can be used for duplicate detection.',
      }
    ),
  },
  'analyzer.language': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.languageTitle', {
      defaultMessage: 'Language',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.analyzer.languageDescription',
      {
        defaultMessage:
          'Elasticsearch provides many language-specific analyzers like english or french.',
      }
    ),
  },
  'similarity.bm25': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.similarity.bm25Title', {
      defaultMessage: 'Okapi BM25',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.similarity.bm25Description',
      {
        defaultMessage: 'The default algorithm used in Elasticsearch and Lucene.',
      }
    ),
  },
  'similarity.boolean': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.similarity.booleanTitle', {
      defaultMessage: 'Boolean',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.similarity.booleanDescription',
      {
        defaultMessage:
          'A boolean similarity to use when full text-ranking is not needed. The score is based on whether the query terms match.',
      }
    ),
  },
  'termVector.no': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.termVector.noTitle', {
      defaultMessage: 'No',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.noDescription',
      {
        defaultMessage: 'No term vectors are stored.',
      }
    ),
  },
  'termVector.yes': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.termVector.yesTitle', {
      defaultMessage: 'Yes',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.yesDescription',
      {
        defaultMessage: 'Just the terms in the field are stored.',
      }
    ),
  },
  'termVector.withPositions': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsTitle', {
      defaultMessage: 'With positions',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsDescription',
      {
        defaultMessage: 'Terms and positions are stored.',
      }
    ),
  },
  'termVector.withOffsets': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.termVector.withOffsetsTitle', {
      defaultMessage: 'With offsets',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withOffsetsDescription',
      {
        defaultMessage: 'Terms and character offsets are stored.',
      }
    ),
  },
  'termVector.withPositionsOffsets': {
    title: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsOffsetsTitle',
      {
        defaultMessage: 'With positions and offsets',
      }
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsOffsetsDescription',
      {
        defaultMessage: 'Terms, positions, and character offsets are stored.',
      }
    ),
  },
  'termVector.withPositionsPayloads': {
    title: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsPayloadsTitle',
      {
        defaultMessage: 'With positions and payloads',
      }
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsPayloadsDescription',
      {
        defaultMessage: 'Terms, positions, and payloads are stored.',
      }
    ),
  },
  'termVector.withPositionsOffsetsPayloads': {
    title: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsOffsetsPayloadsTitle',
      {
        defaultMessage: 'With positions, offsets, and payloads',
      }
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.termVector.withPositionsOffsetsPayloadsDescription',
      {
        defaultMessage: 'Terms, positions, offsets and payloads are stored.',
      }
    ),
  },
  'orientation.counterclockwise': {
    title: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.orientation.counterclockwiseTitle',
      {
        defaultMessage: 'Counterclockwise',
      }
    ),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.orientation.counterclockwiseDescription',
      {
        defaultMessage:
          'Defines outer polygon vertices in counterclockwise order and interior shape vertices in clockwise order. This is the Open Geospatial Consortium (OGC) and GeoJSON standard.',
      }
    ),
  },
  'orientation.clockwise': {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.orientation.clockwiseTitle', {
      defaultMessage: 'Clockwise',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.formSelect.orientation.clockwiseDescription',
      {
        defaultMessage:
          'Defines outer polygon vertices in clockwise order and interior shape vertices in counterclockwise order.',
      }
    ),
  },
};

export const LANGUAGE_OPTIONS_TEXT: { [key in LanguageAnalyzerOption]: string } = {
  arabic: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.arabic', {
    defaultMessage: 'Arabic',
  }),
  armenian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.armenian', {
    defaultMessage: 'Armenian',
  }),
  basque: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.basque', {
    defaultMessage: 'Basque',
  }),
  bengali: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.bengali', {
    defaultMessage: 'Bengali',
  }),
  brazilian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.brazilian', {
    defaultMessage: 'Brazilian',
  }),
  bulgarian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.bulgarian', {
    defaultMessage: 'Bulgarian',
  }),
  catalan: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.catalan', {
    defaultMessage: 'Catalan',
  }),
  cjk: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.cjk', {
    defaultMessage: 'Cjk',
  }),
  czech: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.czech', {
    defaultMessage: 'Czech',
  }),
  danish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.danish', {
    defaultMessage: 'Danish',
  }),
  dutch: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.dutch', {
    defaultMessage: 'Dutch',
  }),
  english: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.english', {
    defaultMessage: 'English',
  }),
  finnish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.finnish', {
    defaultMessage: 'Finnish',
  }),
  french: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.french', {
    defaultMessage: 'French',
  }),
  galician: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.galician', {
    defaultMessage: 'Galician',
  }),
  german: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.german', {
    defaultMessage: 'German',
  }),
  greek: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.greek', {
    defaultMessage: 'Greek',
  }),
  hindi: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.hindi', {
    defaultMessage: 'Hindi',
  }),
  hungarian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.hungarian', {
    defaultMessage: 'Hungarian',
  }),
  indonesian: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.indonesian',
    {
      defaultMessage: 'Indonesian',
    }
  ),
  irish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.irish', {
    defaultMessage: 'Irish',
  }),
  italian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.italian', {
    defaultMessage: 'Italian',
  }),
  latvian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.latvian', {
    defaultMessage: 'Latvian',
  }),
  lithuanian: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.lithuanian',
    {
      defaultMessage: 'Lithuanian',
    }
  ),
  norwegian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.norwegian', {
    defaultMessage: 'Norwegian',
  }),
  persian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.persian', {
    defaultMessage: 'Persian',
  }),
  portuguese: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.portuguese',
    {
      defaultMessage: 'Portuguese',
    }
  ),
  romanian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.romanian', {
    defaultMessage: 'Romanian',
  }),
  russian: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.russian', {
    defaultMessage: 'Russian',
  }),
  sorani: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.sorani', {
    defaultMessage: 'Sorani',
  }),
  spanish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.spanish', {
    defaultMessage: 'Spanish',
  }),
  swedish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.swedish', {
    defaultMessage: 'Swedish',
  }),
  thai: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.thai', {
    defaultMessage: 'Thai',
  }),
  turkish: i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.languageAnalyzer.turkish', {
    defaultMessage: 'Turkish',
  }),
};

export const breakdown = {
  advance: 0,
  advance_count: 0,
  build_scorer: 6273,
  build_scorer_count: 2,
  create_weight: 1852,
  create_weight_count: 1,
  match: 0,
  match_count: 0,
  next_doc: 2593093,
  next_doc_count: 27958,
  score: 2525502,
  score_count: 27948,
};

export const normalized = [
  {
    key: 'next_doc',
    time: 2593093,
    relative: '50.6',
    color: '#fad2d2',
    tip: 'The time taken to advance the iterator to the next matching document.',
  },
  {
    key: 'score',
    time: 2525502,
    relative: '49.3',
    color: '#fad2d2',
    tip: 'The time taken in actually scoring the document against the query.',
  },
  { key: 'next_doc_count', time: 27958, relative: 0, color: '#f5f5f5', tip: '' },
  { key: 'score_count', time: 27948, relative: 0, color: '#f5f5f5', tip: '' },
  {
    key: 'build_scorer',
    time: 6273,
    relative: '0.1',
    color: '#f5f5f5',
    tip:
      'The time taken to create the Scoring object, which is later used to execute the actual scoring of each doc.',
  },
  {
    key: 'create_weight',
    time: 1852,
    relative: '0.0',
    color: '#f5f5f5',
    tip:
      'The time taken to create the Weight object, which holds temporary information during scoring.',
  },
  { key: 'build_scorer_count', time: 2, relative: 0, color: '#f5f5f5', tip: '' },
  { key: 'create_weight_count', time: 1, relative: 0, color: '#f5f5f5', tip: '' },
  {
    key: 'advance',
    time: 0,
    relative: '0.0',
    color: '#f5f5f5',
    tip: 'The time taken to advance the iterator to the next document.',
  },
  { key: 'advance_count', time: 0, relative: 0, color: '#f5f5f5', tip: '' },
  {
    key: 'match',
    time: 0,
    relative: '0.0',
    color: '#f5f5f5',
    tip:
      'The time taken to execute a secondary, more precise scoring phase (used by phrase queries).',
  },
  { key: 'match_count', time: 0, relative: 0, color: '#f5f5f5', tip: '' },
];

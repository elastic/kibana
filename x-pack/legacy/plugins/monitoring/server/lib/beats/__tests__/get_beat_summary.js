/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_beat_summary';
import expect from '@kbn/expect';

describe('get_beat_summary', () => {
  it('Handles empty aggregation', () => {
    const response = {};
    const beatUuid = 'fooUuid';

    expect(handleResponse(response, beatUuid)).to.eql({
      uuid: 'fooUuid',
      transportAddress: null,
      version: null,
      name: null,
      type: null,
      output: null,
      eventsTotal: null,
      eventsDropped: null,
      eventsEmitted: null,
      bytesWritten: null,
      configReloads: null,
      uptime: null,
      handlesHardLimit: null,
      handlesSoftLimit: null
    });
  });

  it('Returns summarized data', () => {
    const response = {
      hits: {
        hits: [
          {
            _source: {
              beats_stats: {
                beat: {
                  host: 'beat-summary.test',
                  name: 'beat-summary.test-0101',
                  type: 'filebeat',
                  version: '6.2.0',
                },
                metrics: {
                  beat: {
                    info: {
                      uptime: {
                        ms: 32 * 1000 * 1000 * 1000,
                      }
                    },
                    handles: {
                      limit: {
                        hard: 14000,
                        soft: 14000
                      }
                    }
                  },
                  libbeat: {
                    output: {
                      type: 'kafka',
                      write: {
                        bytes: 293845923,
                      }
                    },
                    pipeline: {
                      events: {
                        published: 2300,
                        total: 2320,
                        dropped: 1,
                      }
                    },
                    config: {
                      reloads: 17
                    }
                  }
                }
              }
            },
            inner_hits: {
              first_hit: {
                hits: {
                  hits: [
                    {
                      _source: {
                        beats_stats: {
                          metrics: {
                            libbeat: {
                              output: {
                                write: {
                                  bytes: 277845923,
                                }
                              },
                              pipeline: {
                                events: {
                                  published: 2100,
                                  total: 2020,
                                  dropped: 0,
                                }
                              },
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    };
    const beatUuid = 'fooUuid';

    expect(handleResponse(response, beatUuid)).to.eql({
      uuid: 'fooUuid',
      transportAddress: 'beat-summary.test',
      version: '6.2.0',
      name: 'beat-summary.test-0101',
      type: 'Filebeat',
      output: 'Kafka',
      eventsTotal: 300,
      eventsDropped: 1,
      eventsEmitted: 200,
      bytesWritten: 16000000,
      configReloads: 17,
      uptime: 32000000000,
      handlesHardLimit: 14000,
      handlesSoftLimit: 14000
    });
  });

  it('Returns summarized data with nulls (N/A) if beat restarted', () => {
    const response = {
      hits: {
        hits: [
          {
            _source: {
              beats_stats: {
                beat: {
                  host: 'beat-summary.test',
                  name: 'beat-summary.test-0101',
                  type: 'filebeat',
                  version: '6.2.0',
                },
                metrics: {
                  beat: {
                    info: {
                      uptime: {
                        ms: 32 * 1000 * 1000
                      }
                    },
                    handles: {
                      limit: {
                        hard: 14000,
                        soft: 14000
                      }
                    }
                  },
                  libbeat: {
                    output: {
                      type: 'kafka',
                      write: {
                        bytes: 6645923,
                      }
                    },
                    pipeline: {
                      events: {
                        published: 100,
                        total: 20,
                        dropped: 0,
                      }
                    },
                    config: {
                      reloads: 18
                    }
                  }
                }
              }
            },
            inner_hits: {
              first_hit: {
                hits: {
                  hits: [
                    {
                      _source: {
                        beats_stats: {
                          metrics: {
                            libbeat: {
                              output: {
                                write: {
                                  bytes: 277845923,
                                }
                              },
                              pipeline: {
                                events: {
                                  published: 2100,
                                  total: 2020,
                                  dropped: 0,
                                }
                              },
                            }
                          }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    };
    const beatUuid = 'fooUuid';

    expect(handleResponse(response, beatUuid)).to.eql({
      uuid: 'fooUuid',
      transportAddress: 'beat-summary.test',
      version: '6.2.0',
      name: 'beat-summary.test-0101',
      type: 'Filebeat',
      output: 'Kafka',
      eventsTotal: null,
      eventsDropped: 0,
      eventsEmitted: null,
      bytesWritten: null,
      configReloads: 18,
      uptime: 32000000,
      handlesHardLimit: 14000,
      handlesSoftLimit: 14000
    });
  });
});

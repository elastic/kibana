export function getListingsResponses() {
  return {
    obsolete_hit: {
      _source: {
        beats_stats: {
          beat: {
            host: 'spicy.local',
            name: 'spicy.local',
            type: 'filebeat',
            uuid: '2736e08b-5830-409b-8169-32aac39c5e55',
            version: '7.0.0-alpha1'
          },
          metrics: {
            beat: {
              info: {
                ephemeral_id: '919c2130-47ea-4f6b-8e7c-510d87e185f2'
              },
              memstats: {
                memory_alloc: 30680648
              }
            },
            libbeat: {
              output: {
                read: {
                  errors: 0
                },
                type: 'elasticsearch',
                write: {
                  bytes: 137661163,
                  errors: 0
                }
              },
              pipeline: {
                events: {
                  total: 100
                }
              }
            }
          },
          timestamp: '2018-02-09T21:49:35.683Z'
        }
      },
      inner_hits: {
        earliest: {
          hits: {
            hits: [
              {
                _source: {
                  beats_stats: {
                    metrics: {
                      libbeat: {
                        output: {
                          read: {
                            errors: 0
                          },
                          write: {
                            bytes: 49325414,
                            errors: 0
                          }
                        },
                        pipeline: {
                          events: {
                            total: 34
                          }
                        }
                      }
                    },
                    timestamp: '2018-02-09T21:49:15.683Z'
                  }
                }
              }
            ]
          }
        }
      }
    },
    unique_hits: [
      {
        _source: {
          beats_stats: {
            beat: {
              host: 'spicy.local',
              name: 'spicy.local',
              type: 'filebeat',
              uuid: '2736e08b-5830-409b-8169-32aac39c5e55',
              version: '7.0.0-alpha1'
            },
            metrics: {
              beat: {
                info: {
                  ephemeral_id: 'd9b3ccac-cb80-4cb4-9179-2295a305679f'
                },
                memstats: {
                  memory_alloc: 27209376
                }
              },
              libbeat: {
                output: {
                  read: {
                    errors: 0
                  },
                  type: 'elasticsearch',
                  write: {
                    bytes: 2046089790,
                    errors: 0
                  }
                },
                pipeline: {
                  events: {
                    total: 1366
                  }
                }
              }
            },
            timestamp: '2018-02-09T21:48:55.244Z'
          }
        },
        inner_hits: {
          earliest: {
            hits: {
              hits: [
                {
                  _source: {
                    beats_stats: {
                      metrics: {
                        libbeat: {
                          output: {
                            read: {
                              errors: 0
                            },
                            write: {
                              bytes: 103678160,
                              errors: 0
                            }
                          },
                          pipeline: {
                            events: {
                              total: 69
                            }
                          }
                        }
                      },
                      timestamp: '2018-02-09T21:42:35.243Z'
                    }
                  }
                }
              ]
            }
          }
        }
      },
      {
        _source: {
          beats_stats: {
            beat: {
              host: 'spicy.local',
              name: 'spicy.local',
              type: 'metricbeat',
              uuid: '60599a4f-8139-4251-b0b9-15866df34221',
              version: '7.0.0-alpha1'
            },
            metrics: {
              beat: {
                info: {
                  ephemeral_id: 'f506ef06-1f89-4520-b698-b5591c0784b8'
                },
                memstats: {
                  memory_alloc: 7598304
                }
              },
              libbeat: {
                output: {
                  read: {
                    errors: 0
                  },
                  type: 'elasticsearch',
                  write: {
                    bytes: 9992700,
                    errors: 0
                  }
                },
                pipeline: {
                  events: {
                    total: 12011
                  }
                }
              }
            },
            timestamp: '2018-02-09T21:49:38.496Z'
          }
        },
        inner_hits: {
          earliest: {
            hits: {
              hits: [
                {
                  _source: {
                    beats_stats: {
                      metrics: {
                        libbeat: {
                          output: {
                            read: {
                              errors: 0
                            },
                            write: {
                              bytes: 427954,
                              errors: 0
                            }
                          },
                          pipeline: {
                            events: {
                              total: 545
                            }
                          }
                        }
                      },
                      timestamp: '2018-02-09T21:42:38.496Z'
                    }
                  }
                }
              ]
            }
          }
        }
      }
    ]
  };
}

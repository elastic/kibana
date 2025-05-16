/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canSkipSourceUpdate, updateDueToExtent } from './can_skip_fetch';
import { DataRequest } from './data_request';
import { Filter } from '@kbn/es-query';
import { ISource } from '../sources/source';

describe('updateDueToExtent', () => {
  it('should be false when buffers are the same', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(false);
  });

  it('should be false when the new buffer is contained in the old buffer', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 10,
      maxLon: 100,
      minLat: 5,
      minLon: 95,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(false);
  });

  it('should be true when the new buffer is contained in the old buffer and the past results were truncated', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 10,
      maxLon: 100,
      minLat: 5,
      minLon: 95,
    };
    expect(
      updateDueToExtent({ buffer: oldBuffer, areResultsTrimmed: true }, { buffer: newBuffer })
    ).toBe(true);
  });

  it('should be true when meta has no old buffer', async () => {
    expect(updateDueToExtent()).toBe(true);
  });

  it('should be true when the new buffer is not contained in the old buffer', async () => {
    const oldBuffer = {
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    };
    const newBuffer = {
      maxLat: 7.5,
      maxLon: 92.5,
      minLat: -2.5,
      minLon: 82.5,
    };
    expect(updateDueToExtent({ buffer: oldBuffer }, { buffer: newBuffer })).toBe(true);
  });
});

describe('canSkipSourceUpdate', () => {
  const SOURCE_DATA_REQUEST_ID = 'foo';
  const getUpdateDueToTimeslice = () => {
    return true;
  };

  describe('isQueryAware', () => {
    const queryAwareSourceMock = {
      isTimeAware: () => {
        return false;
      },
      isFilterByMapBounds: () => {
        return false;
      },
      isFieldAware: () => {
        return false;
      },
      isQueryAware: () => {
        return true;
      },
      isGeoGridPrecisionAware: () => {
        return false;
      },
    };
    const prevFilters: Filter[] = [];
    const prevQuery = {
      language: 'kuery',
      query: 'machine.os.keyword : "win 7"',
    };

    describe('applyGlobalQuery is false', () => {
      const prevApplyGlobalQuery = false;

      const prevDataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        },
        data: {},
      });

      it('can skip update when filter changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [{} as unknown as Filter],
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when query changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('Should not skip refresh update when applyForceRefresh is true', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
          isForceRefresh: true,
          applyForceRefresh: true,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('Should skip refresh update when applyForceRefresh is false', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
          isForceRefresh: true,
          applyForceRefresh: false,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });
    });

    describe('applyGlobalQuery is true', () => {
      const prevApplyGlobalQuery = true;

      const prevDataRequest = new DataRequest({
        dataId: SOURCE_DATA_REQUEST_ID,
        dataRequestMeta: {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        },
        data: {},
      });

      it('can not skip update when filter changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: [{} as unknown as Filter],
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: {
            ...prevQuery,
            query: 'a new query string',
          },
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when query is refreshed', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
          isForceRefresh: true,
          applyForceRefresh: true,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when applyGlobalQuery changes', async () => {
        const nextRequestMeta = {
          applyGlobalQuery: !prevApplyGlobalQuery,
          filters: prevFilters,
          query: prevQuery,
        };

        const canSkipUpdate = await canSkipSourceUpdate({
          source: queryAwareSourceMock as unknown as ISource,
          prevDataRequest,
          nextRequestMeta,
          extentAware: queryAwareSourceMock.isFilterByMapBounds(),
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });
    });
  });

  describe('isTimeAware', () => {
    function createSourceMock() {
      return {
        isTimeAware: () => {
          return true;
        },
        isFilterByMapBounds: () => {
          return false;
        },
        isFieldAware: () => {
          return false;
        },
        isQueryAware: () => {
          return false;
        },
        isGeoGridPrecisionAware: () => {
          return false;
        },
      };
    }

    describe('applyGlobalTime', () => {
      it('can not skip update when applyGlobalTime changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock() as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: false,
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when applyGlobalTime does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock() as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });

    describe('timeFilters', () => {
      it('can not skip update when time range changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock() as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when time range does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock() as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-15m',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when time range changes but applyGlobalTime is false', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: createSourceMock() as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: false,
              timeFilters: {
                from: 'now-15m',
                to: 'now',
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: false,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });

    describe('timeslice', () => {
      const mockSource = createSourceMock();
      it('can not skip update when timeslice changes (undefined => provided)', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 0,
              to: 1000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when timeslice changes', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 1000,
              to: 2000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can not skip update when timeslice changes (provided => undefined)', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(false);
      });

      it('can skip update when timeslice does not change', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: true,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: true,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 0,
              to: 1000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });

      it('can skip update when timeslice changes but applyGlobalTime is false', async () => {
        const canSkipUpdate = await canSkipSourceUpdate({
          source: mockSource as unknown as ISource,
          prevDataRequest: new DataRequest({
            dataId: SOURCE_DATA_REQUEST_ID,
            dataRequestMeta: {
              applyGlobalTime: false,
              timeFilters: {
                from: 'now-7d',
                to: 'now',
              },
              timeslice: {
                from: 0,
                to: 1000,
              },
            },
            data: {},
          }),
          nextRequestMeta: {
            applyGlobalTime: false,
            timeFilters: {
              from: 'now-7d',
              to: 'now',
            },
            timeslice: {
              from: 1000,
              to: 2000,
            },
          },
          extentAware: false,
          getUpdateDueToTimeslice,
        });

        expect(canSkipUpdate).toBe(true);
      });
    });
  });
});

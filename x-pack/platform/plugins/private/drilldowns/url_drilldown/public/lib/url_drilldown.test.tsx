/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { IExternalUrl } from '@kbn/core/public';
import { render, waitFor } from '@testing-library/react';
import type { Config } from './url_drilldown';
import { UrlDrilldown } from './url_drilldown';
import type { ValueClickContext } from '@kbn/embeddable-plugin/public';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { createPoint, rowClickData } from './test/data';
import {
  CONTEXT_MENU_TRIGGER,
  ROW_CLICK_TRIGGER,
  SELECT_RANGE_TRIGGER,
  VALUE_CLICK_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import React from 'react';

const mockDataPoints = [
  {
    table: {
      columns: [
        {
          name: 'test',
          id: '1-1',
          meta: {
            type: 'number' as DatatableColumnType,
            field: 'bytes',
            index: 'logstash-*',
            sourceParams: {
              indexPatternId: 'logstash-*',
              type: 'histogram',
              params: {
                field: 'bytes',
                interval: 30,
                otherBucket: true,
              },
            },
          },
        },
      ],
      rows: [
        {
          '1-1': '2048',
        },
      ],
    },
    column: 0,
    row: 0,
    value: 'test',
  },
];

const mockEmbeddableApi = {
  parentApi: {
    filters$: new BehaviorSubject([]),
    query$: new BehaviorSubject({ query: 'test', language: 'kuery' }),
    timeRange$: new BehaviorSubject({ from: 'now-15m', to: 'now' }),
    viewMode$: new BehaviorSubject('edit'),
  },
};

const mockNavigateToUrl = jest.fn(() => Promise.resolve());

class TextExternalUrl implements IExternalUrl {
  constructor(private readonly isCorrect: boolean = true) {}

  public isInternalUrl(url: string): boolean {
    return false;
  }

  public validateUrl(url: string): URL | null {
    return this.isCorrect ? new URL(url) : null;
  }
}

const createDrilldown = (isExternalUrlValid: boolean = true) => {
  const drilldown = new UrlDrilldown({
    externalUrl: new TextExternalUrl(isExternalUrlValid),
    getGlobalScope: () => ({ kibanaUrl: 'http://localhost:5601/' }),
    getSyntaxHelpDocsLink: () => 'http://localhost:5601/docs',
    getVariablesHelpDocsLink: () => 'http://localhost:5601/docs',
    navigateToUrl: mockNavigateToUrl,
    settings: settingsServiceMock.createSetupContract(),
    theme: () => {
      return themeServiceMock.createStartContract();
    },
  });
  return drilldown;
};

const renderActionMenuItem = async (
  drilldown: UrlDrilldown,
  config: Config,
  context: ValueClickContext
) => {
  const { getByTestId } = render(
    <drilldown.actionMenuItem config={{ name: 'test', config }} context={context} />
  );
  await waitFor(() => null); // wait for effects to complete
  return {
    getError: () => getByTestId('urlDrilldown-error'),
  };
};

describe('UrlDrilldown', () => {
  const urlDrilldown = createDrilldown();

  test('license', () => {
    expect(urlDrilldown.minimalLicense).toBe('gold');
  });

  describe('isCompatible', () => {
    test('throws if no embeddable', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
      };

      await expect(urlDrilldown.isCompatible(config, context)).rejects.toThrowError();
    });

    test('compatible in edit mode if url is valid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const result = urlDrilldown.isCompatible(config, context);
      await expect(result).resolves.toBe(true);
    });

    test('compatible in edit mode if url is invalid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.somethingFake}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      await expect(urlDrilldown.isCompatible(config, context)).resolves.toBe(true);
    });

    test('compatible in edit mode if external URL is denied', async () => {
      const drilldown1 = createDrilldown(true);
      const drilldown2 = createDrilldown(false);
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const result1 = await drilldown1.isCompatible(config, context);
      const result2 = await drilldown2.isCompatible(config, context);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    test('compatible in view mode if url is valid', async () => {
      mockEmbeddableApi.parentApi.viewMode$.next('view');

      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const result = urlDrilldown.isCompatible(config, context);
      await expect(result).resolves.toBe(true);
    });

    test('not compatible in view mode if url is invalid', async () => {
      mockEmbeddableApi.parentApi.viewMode$.next('view');
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.somethingFake}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      await expect(urlDrilldown.isCompatible(config, context)).resolves.toBe(false);
    });

    test('not compatible in view mode if external URL is denied', async () => {
      mockEmbeddableApi.parentApi.viewMode$.next('view');
      const drilldown1 = createDrilldown(true);
      const drilldown2 = createDrilldown(false);
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const result1 = await drilldown1.isCompatible(config, context);
      const result2 = await drilldown2.isCompatible(config, context);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('getHref & execute & title', () => {
    beforeEach(() => {
      mockNavigateToUrl.mockReset();
    });

    test('valid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const url = await urlDrilldown.getHref(config, context);
      expect(url).toMatchInlineSnapshot(`"https://elasti.co/?test&(language:kuery,query:test)"`);

      await urlDrilldown.execute(config, context);
      expect(mockNavigateToUrl).toBeCalledWith(url);

      const { getError } = await renderActionMenuItem(urlDrilldown, config, context);
      expect(() => getError()).toThrow();
    });

    test('invalid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.invalid}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      await expect(urlDrilldown.getHref(config, context)).resolves.toBeUndefined();
      await expect(urlDrilldown.execute(config, context)).resolves.toBeUndefined();
      expect(mockNavigateToUrl).not.toBeCalled();

      const { getError } = await renderActionMenuItem(urlDrilldown, config, context);
      expect(getError()).toHaveTextContent(
        `Error building URL: The URL template is not valid in the given context.`
      );
    });

    test('should not throw on denied external URL', async () => {
      const drilldown1 = createDrilldown(true);
      const drilldown2 = createDrilldown(false);
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
        encodeUrl: true,
      };

      const context: ValueClickContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddableApi,
      };

      const url = await drilldown1.getHref(config, context);
      await drilldown1.execute(config, context);

      expect(url).toMatchInlineSnapshot(`"https://elasti.co/?test&(language:kuery,query:test)"`);
      expect(mockNavigateToUrl).toBeCalledWith(url);

      await expect(drilldown2.getHref(config, context)).resolves.toBeUndefined();
      await expect(drilldown2.execute(config, context)).resolves.toBeUndefined();

      const { getError } = await renderActionMenuItem(drilldown2, config, context);
      expect(getError()).toHaveTextContent(`Error building URL: external URL was denied.`);
    });
  });

  describe('variables', () => {
    const embeddable1 = {
      dataViews$: new BehaviorSubject([{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }]),
      title$: new BehaviorSubject('The Title'),
      savedObjectId$: new BehaviorSubject('SAVED_OBJECT_IDxx'),
      uuid: 'test',
    };
    const data = {
      data: [
        createPoint({ field: 'field0', value: 'value0' }),
        createPoint({ field: 'field1', value: 'value1' }),
        createPoint({ field: 'field2', value: 'value2' }),
      ],
    };

    const embeddable2 = {
      dataViews$: new BehaviorSubject([
        { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
        { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
      ]),
      parentApi: {
        filters$: new BehaviorSubject([
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ]),
        query$: new BehaviorSubject({
          language: 'C++',
          query: 'std::cout << 123;',
        }),
        timeRange$: new BehaviorSubject({ from: 'FROM', to: 'TO' }),
      },
      title$: new BehaviorSubject('The Title'),
      savedObjectId$: new BehaviorSubject('SAVED_OBJECT_ID'),
      uuid: 'the-id',
    };

    describe('getRuntimeVariables()', () => {
      test('builds runtime variables for VALUE_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable1,
          data,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'test',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_IDxx',
              indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
          event: {
            key: 'field0',
            value: 'value0',
            negate: false,
            points: [
              {
                value: 'value0',
                key: 'field0',
              },
              {
                value: 'value1',
                key: 'field1',
              },
              {
                value: 'value2',
                key: 'field2',
              },
            ],
          },
        });
      });

      test('builds runtime variables for ROW_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable2,
          data: rowClickData as any,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'the-id',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_ID',
              query: {
                language: 'C++',
                query: 'std::cout << 123;',
              },
              timeRange: {
                from: 'FROM',
                to: 'TO',
              },
              filters: [
                {
                  meta: {
                    alias: 'asdf',
                    disabled: false,
                    negate: false,
                  },
                },
              ],
            },
          },
          event: {
            rowIndex: 1,
            values: ['IT', '2.25', 3, 0, 2],
            keys: ['DestCountry', 'FlightTimeHour', '', 'DistanceMiles', 'OriginAirportID'],
            columnNames: [
              'Top values of DestCountry',
              'Top values of FlightTimeHour',
              'Count of records',
              'Average of DistanceMiles',
              'Unique count of OriginAirportID',
            ],
          },
        });
      });
    });

    describe('getVariableList()', () => {
      test('builds variable list for VALUE_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [VALUE_CLICK_TRIGGER],
          embeddable: embeddable1,
        });

        const expectedList = [
          'event.key',
          'event.value',
          'event.negate',
          'event.points',

          'context.panel.id',
          'context.panel.title',
          'context.panel.indexPatternId',
          'context.panel.savedObjectId',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(!!list.find(({ label }) => label === expectedItem)).toBe(true);
        }
      });

      test('builds variable list for ROW_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [ROW_CLICK_TRIGGER],
          embeddable: embeddable2,
        });

        const expectedList = [
          'event.columnNames',
          'event.keys',
          'event.rowIndex',
          'event.values',

          'context.panel.id',
          'context.panel.title',
          'context.panel.filters',
          'context.panel.query.language',
          'context.panel.query.query',
          'context.panel.indexPatternIds',
          'context.panel.savedObjectId',
          'context.panel.timeRange.from',
          'context.panel.timeRange.to',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(!!list.find(({ label }) => label === expectedItem)).toBe(true);
        }
      });
    });
  });

  describe('example url', () => {
    it('provides the expected example urls based on the trigger', () => {
      expect(urlDrilldown.getExampleUrl({ triggers: [] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(urlDrilldown.getExampleUrl({ triggers: ['unknown'] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(urlDrilldown.getExampleUrl({ triggers: [VALUE_CLICK_TRIGGER] })).toMatchInlineSnapshot(
        `"https://www.example.com/?{{event.key}}={{event.value}}"`
      );

      expect(
        urlDrilldown.getExampleUrl({ triggers: [SELECT_RANGE_TRIGGER] })
      ).toMatchInlineSnapshot(`"https://www.example.com/?from={{event.from}}&to={{event.to}}"`);

      expect(urlDrilldown.getExampleUrl({ triggers: [ROW_CLICK_TRIGGER] })).toMatchInlineSnapshot(
        `"https://www.example.com/keys={{event.keys}}&values={{event.values}}"`
      );

      expect(
        urlDrilldown.getExampleUrl({ triggers: [CONTEXT_MENU_TRIGGER] })
      ).toMatchInlineSnapshot(`"https://www.example.com/?panel={{context.panel.title}}"`);
    });
  });
});

describe('encoding', () => {
  const urlDrilldown = createDrilldown();
  const context: ValueClickContext = {
    data: {
      data: mockDataPoints,
    },
    embeddable: mockEmbeddableApi,
  };

  test('encodes URL by default', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
      encodeUrl: true,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders');
  });

  test('encodes URL when encoding is enabled', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
      encodeUrl: true,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders');
  });

  test('does not encode URL when encoding is not enabled', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo=head%26shoulders',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%26shoulders');
  });

  test('can encode URI component using "encodeURIComponent" Handlebars helper', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo={{encodeURIComponent "head%26shoulders@gmail.com"}}',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders%40gmail.com');
  });

  test('can encode URI component using "encodeURIQuery" Handlebars helper', async () => {
    const config: Config = {
      url: {
        template: 'https://elastic.co?foo={{encodeURIQuery "head%26shoulders@gmail.com"}}',
      },
      openInNewTab: false,
      encodeUrl: false,
    };
    const url = await urlDrilldown.getHref(config, context);

    expect(url).toBe('https://elastic.co?foo=head%2526shoulders@gmail.com');
  });
});

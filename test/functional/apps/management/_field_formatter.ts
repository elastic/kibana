/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ES_FIELD_TYPES } from '@kbn/field-types';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { FIELD_FORMAT_IDS } from '../../../../src/plugins/field_formats/common';
import { WebElementWrapper } from '../../services/lib/web_element_wrapper';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['settings', 'common']);
  const testSubjects = getService('testSubjects');
  const security = getService('security');
  const es = getService('es');
  const indexPatterns = getService('indexPatterns');
  const toasts = getService('toasts');

  describe('field formatter', function () {
    this.tags(['skipFirefox']);

    before(async function () {
      await browser.setWindowSize(1200, 800);
      await security.testUser.setRoles([
        'kibana_admin',
        'test_field_formatters',
        'test_logstash_reader',
      ]);
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await kibanaServer.uiSettings.replace({});
    });

    after(async function afterAll() {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('set and change field formatter', function describeIndexTests() {
      // addresses https://github.com/elastic/kibana/issues/93349
      it('can change format more than once', async function () {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternLogstash();
        await PageObjects.settings.clickAddField();
        await PageObjects.settings.setFieldType('Long');
        const formatRow = await testSubjects.find('formatRow');
        const formatRowToggle = (
          await formatRow.findAllByCssSelector('[data-test-subj="toggle"]')
        )[0];

        await formatRowToggle.click();
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.setFieldFormat('bytes');
        await PageObjects.settings.setFieldFormat('duration');
        await PageObjects.settings.closeIndexPatternFieldEditor();
      });
    });

    /**
     * The purpose of these tests is to cover **editing experience** of different field formats editors,
     * The logic of each converter is extensively covered by unit tests.
     * TODO: these tests also could check field formats behaviour with different combinations of browser locale, timezone and ui settings
     */
    describe('field format editors', () => {
      describe('String format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A regular text',

            // check available formats for ES_FIELD_TYPES.TEXT
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          {
            fieldType: ES_FIELD_TYPES.TEXT,
            fieldValue: 'A regular text',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'a regular text',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'lower');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A KEYWORD',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'upper');
            },
            // check available formats for ES_FIELD_TYPES.KEYWORD
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.TRUNCATE,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'a keyword',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'A Keyword',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'title');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'com.organizations.project.ClassName',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'c.o.p.ClassName',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'short');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'SGVsbG8gd29ybGQ=',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: 'Hello world',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'base64');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98',
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '안녕 키바나',
            beforeSave: async () => {
              await testSubjects.selectValue('stringEditorTransform', 'urlparam');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: '123456789',
            applyFormatterType: FIELD_FORMAT_IDS.TRUNCATE,
            expectFormattedValue: '123...',
            beforeSave: async () => {
              await testSubjects.setValue('truncateEditorLength', '3');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.INTEGER,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.STRING,
            expectFormattedValue: '324',
            // check available formats for ES_FIELD_TYPES.INTEGER
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
        ]);
      });

      describe('Number format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '324',
            // check available formats for ES_FIELD_TYPES.LONG
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 324,
            applyFormatterType: FIELD_FORMAT_IDS.NUMBER,
            expectFormattedValue: '+324',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '+0,0');
            },
          },
        ]);
      });

      describe('URL format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'https://elastic.co/?value=100',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
            },
            expect: async (renderedValueContainer) => {
              expect(
                await (await renderedValueContainer.findByTagName('a')).getAttribute('href')
              ).to.be('https://elastic.co/?value=100');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 100,
            applyFormatterType: FIELD_FORMAT_IDS.URL,
            expectFormattedValue: 'url label',
            beforeSave: async () => {
              await testSubjects.setValue(
                'urlEditorUrlTemplate',
                'https://elastic.co/?value={{value}}'
              );
              await testSubjects.setValue('urlEditorLabelTemplate', 'url label');
            },
            expect: async (renderedValueContainer) => {
              expect(
                await (await renderedValueContainer.findByTagName('a')).getAttribute('href')
              ).to.be('https://elastic.co/?value=100');
            },
          },
        ]);
      });

      describe('Date format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.DATE,
            fieldValue: '2021-08-05T15:05:37.151Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Aug 5, 2021',
            beforeSave: async () => {
              await testSubjects.setValue('dateEditorPattern', 'MMM D, YYYY');
            },
            // check available formats for ES_FIELD_TYPES.DATE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.DATE,
              FIELD_FORMAT_IDS.DATE_NANOS,
              FIELD_FORMAT_IDS.RELATIVE_DATE,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123',
            // check available formats for ES_FIELD_TYPES.DATE_NANOS
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.DATE,
              FIELD_FORMAT_IDS.DATE_NANOS,
              FIELD_FORMAT_IDS.RELATIVE_DATE,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
          },
          {
            fieldType: ES_FIELD_TYPES.DATE_NANOS,
            fieldValue: '2015-01-01T12:10:30.123456789Z',
            applyFormatterType: FIELD_FORMAT_IDS.DATE_NANOS,
            expectFormattedValue: 'Jan 1, 2015 @ 12:10:30.123456789',
          },
        ]);
      });

      describe('Static lookup format', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'look me up',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'looked up!',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'look me up');
              await testSubjects.setValue('~staticLookupEditorValue', 'looked up!');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'true',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            // check available formats for ES_FIELD_TYPES.BOOLEAN
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
            expectFormattedValue: 'yes',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'no');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'false',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'no',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
              await testSubjects.setValue('staticLookupEditorUnknownValue', 'no');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.BOOLEAN,
            fieldValue: 'false',
            applyFormatterType: FIELD_FORMAT_IDS.STATIC_LOOKUP,
            expectFormattedValue: 'false',
            beforeSave: async () => {
              await testSubjects.click('staticLookupEditorAddEntry');
              await testSubjects.setValue('~staticLookupEditorKey', 'true');
              await testSubjects.setValue('~staticLookupEditorValue', 'yes');
            },
          },
        ]);
      });

      describe('Other formats', () => {
        testFormatEditors([
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 123292,
            applyFormatterType: FIELD_FORMAT_IDS.DURATION,
            expectFormattedValue: '2 minutes',
            beforeSave: async () => {
              await testSubjects.setValue('durationEditorInputFormat', 'milliseconds');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.DOUBLE,
            fieldValue: 0.1,
            applyFormatterType: FIELD_FORMAT_IDS.PERCENT,
            // check available formats for ES_FIELD_TYPES.DOUBLE
            expectFormatterTypes: [
              FIELD_FORMAT_IDS.BOOLEAN,
              FIELD_FORMAT_IDS.BYTES,
              FIELD_FORMAT_IDS.COLOR,
              FIELD_FORMAT_IDS.DURATION,
              FIELD_FORMAT_IDS.NUMBER,
              FIELD_FORMAT_IDS.PERCENT,
              FIELD_FORMAT_IDS.STATIC_LOOKUP,
              FIELD_FORMAT_IDS.STRING,
              FIELD_FORMAT_IDS.URL,
            ],
            expectFormattedValue: '10.0%',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0.0%');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.LONG,
            fieldValue: 1990000000,
            applyFormatterType: FIELD_FORMAT_IDS.BYTES,
            expectFormattedValue: '2GB',
            beforeSave: async () => {
              await testSubjects.setValue('numberEditorFormatPattern', '0b');
            },
          },
          {
            fieldType: ES_FIELD_TYPES.KEYWORD,
            fieldValue: 'red',
            applyFormatterType: FIELD_FORMAT_IDS.COLOR,
            expectFormattedValue: 'red',
            beforeSave: async () => {
              await testSubjects.click('colorEditorAddColor');
              await testSubjects.setValue('~colorEditorKeyPattern', 'red');
              await testSubjects.setValue('~colorEditorColorPicker', '#ffffff');
              await testSubjects.setValue('~colorEditorBackgroundPicker', '#ff0000');
            },
            expect: async (renderedValueContainer) => {
              const span = await renderedValueContainer.findByTagName('span');
              expect(await span.getComputedStyle('color')).to.be('rgba(255, 255, 255, 1)');
              expect(await span.getComputedStyle('background-color')).to.be('rgba(255, 0, 0, 1)');
            },
          },
        ]);
      });
    });
  });

  /**
   * Runs a field format editors tests covering data setup, editing a field and checking a resulting formatting in Discover app
   * TODO: might be useful to reuse this util for runtime fields formats tests
   * @param specs - {@link FieldFormatEditorSpecDescriptor}
   */
  function testFormatEditors(specs: FieldFormatEditorSpecDescriptor[]) {
    const indexTitle = 'field_formats_management_functional_tests';
    let indexPatternId: string;
    let testDocumentId: string;

    before(async () => {
      if (await es.indices.exists({ index: indexTitle })) {
        await es.indices.delete({ index: indexTitle });
      }

      await es.indices.create({
        index: indexTitle,
        body: {
          mappings: {
            // @ts-expect-error Type 'Record<string, { type: ES_FIELD_TYPES; }>' is not assignable to type 'Record<string, MappingProperty>'.
            properties: specs.reduce((properties, spec, index) => {
              properties[`${index}`] = { type: spec.fieldType };
              return properties;
            }, {} as Record<string, { type: ES_FIELD_TYPES }>),
          },
        },
      });

      const docResult = await es.index({
        index: indexTitle,
        body: specs.reduce((properties, spec, index) => {
          properties[`${index}`] = spec.fieldValue;
          return properties;
        }, {} as Record<string, FieldFormatEditorSpecDescriptor['fieldValue']>),
        refresh: 'wait_for',
      });
      testDocumentId = docResult._id;

      const indexPatternResult = await indexPatterns.create(
        { title: indexTitle },
        { override: true }
      );
      indexPatternId = indexPatternResult.id!;
    });

    describe('edit formats', () => {
      before(async () => {
        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.clickIndexPatternByName(indexTitle);
      });

      afterEach(async () => {
        try {
          await PageObjects.settings.controlChangeSave();
        } catch (e) {
          // in case previous test failed in a state when save is disabled
          await PageObjects.settings.controlChangeCancel();
        }

        await toasts.dismissAllToasts(); // dismiss "saved" toast, otherwise it could overlap save button for a next test
      });

      specs.forEach((spec, index) => {
        const fieldName = `${index}`;
        it(
          `edit field format of "${fieldName}" field to "${spec.applyFormatterType}"` +
            spec.expectFormatterTypes
            ? `, and check available formats types`
            : '',
          async () => {
            await PageObjects.settings.filterField(fieldName);
            await PageObjects.settings.openControlsByName(fieldName);
            await PageObjects.settings.toggleRow('formatRow');

            if (spec.expectFormatterTypes) {
              expect(
                (
                  await Promise.all(
                    (
                      await (
                        await testSubjects.find('editorSelectedFormatId')
                      ).findAllByTagName('option')
                    ).map((option) => option.getAttribute('value'))
                  )
                ).filter(Boolean)
              ).to.eql(spec.expectFormatterTypes);
            }

            await PageObjects.settings.setFieldFormat(spec.applyFormatterType);
            if (spec.beforeSave) {
              await spec.beforeSave(await testSubjects.find('formatRow'));
            }
          }
        );
      });
    });

    describe('check formats', async () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover', {
          hash: `/doc/${indexPatternId}/${indexTitle}?id=${testDocumentId}`,
        });
        await testSubjects.exists('doc-hit');
      });

      specs.forEach((spec, index) => {
        it(`check field format of "${index}" field`, async () => {
          const renderedValue = await testSubjects.find(`tableDocViewRow-${index}-value`);
          const text = await renderedValue.getVisibleText();
          expect(text).to.be(spec.expectFormattedValue);
          if (spec.expect) {
            await spec.expect(renderedValue);
          }
        });
      });
    });
  }
}

/**
 * Describes a field format editor test
 */
interface FieldFormatEditorSpecDescriptor {
  /**
   * Raw field value to put into document
   */
  fieldValue: string | number | boolean | null;
  /**
   * Explicitly specify a type for a {@link fieldValue}
   */
  fieldType: ES_FIELD_TYPES;
  /**
   * Type of a field formatter to apply
   */
  applyFormatterType: FIELD_FORMAT_IDS;

  /**
   * Optionally check available formats for {@link fieldType}
   */
  expectFormatterTypes?: FIELD_FORMAT_IDS[];

  /**
   * Function to execute before field format is applied.
   * Use it set specific configuration params for applied field formatter
   * @param formatRowContainer - field format editor container
   */
  beforeSave?: (formatRowContainer: WebElementWrapper) => Promise<void>;

  /**
   * An expected formatted value rendered by Discover app,
   * Use this for final assertion
   */
  expectFormattedValue: string;

  /**
   * Run additional assertions on rendered element
   */
  expect?: (renderedValueContainer: WebElementWrapper) => Promise<void>;
}

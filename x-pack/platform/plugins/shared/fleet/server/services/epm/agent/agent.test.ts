/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { Logger } from '@kbn/core/server';

import { appContextService } from '../..';

import { compileTemplate } from './agent';

jest.mock('../../app_context');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

let mockedLogger: jest.Mocked<Logger>;

describe('compileTemplate', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
  });

  it('should work', () => {
    const streamTemplate = `
input: log
paths:
{{#each paths}}
  - {{this}}
{{/each}}
exclude_files: [".gz$"]
processors:
  - add_locale: ~
password: {{password}}
{{#if password}}
hidden_password: {{password}}
{{/if}}
{{#if optional_field}}
optional_field: {{optional_field}}
{{/if}}
foo: {{bar}}
some_text_field: {{should_be_text}}
multi_text_field:
{{#each multi_text}}
  - !!str {{this}}
{{/each}}
      `;
    const vars = {
      paths: { value: ['/usr/local/var/log/nginx/access.log'] },
      password: { type: 'password', value: '' },
      optional_field: { type: 'text', value: undefined },
      bar: { type: 'text', value: 'bar' },
      should_be_text: { type: 'text', value: 'textvalue' },
      multi_text: { type: 'text', value: ['1234', 'foo', 'bar'] },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'log',
      paths: ['/usr/local/var/log/nginx/access.log'],
      exclude_files: ['.gz$'],
      processors: [{ add_locale: null }],
      password: '',
      foo: 'bar',
      some_text_field: 'textvalue',
      multi_text_field: ['1234', 'foo', 'bar'],
    });
  });

  it('should support yaml values', () => {
    const streamTemplate = `
input: redis/metrics
metricsets: ["key"]
test: null
password: {{password}}
{{custom}}
custom: {{ custom }}
{{#if key.patterns}}
key.patterns: {{key.patterns}}
{{/if}}
{{#if emptyfield}}
emptyfield: {{emptyfield}}
{{/if}}
{{#if nullfield}}
nullfield: {{nullfield}}
{{/if}}
{{ testEmpty }}
      `;
    const vars = {
      'key.patterns': {
        type: 'yaml',
        value: `
        - limit: 20
          pattern: '*'
        `,
      },
      custom: {
        type: 'yaml',
        value: `
foo: bar
        `,
      },
      password: { type: 'password', value: '' },
      emptyfield: { type: 'yaml', value: '' },
      nullfield: { type: 'yaml' },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'redis/metrics',
      metricsets: ['key'],
      test: null,
      'key.patterns': [
        {
          limit: 20,
          pattern: '*',
        },
      ],
      password: '',
      foo: 'bar',
      custom: { foo: 'bar' },
    });
  });

  describe('contains blocks', () => {
    const streamTemplate = `
input: log
paths:
{{#each paths}}
  - {{this}}
{{/each}}
exclude_files: [".gz$"]
tags:
{{#each tags}}
  - {{this}}
{{/each}}
{{#contains "forwarded" tags}}
publisher_pipeline.disable_host: true
{{/contains}}
processors:
  - add_locale: ~
password: {{password}}
{{#if password}}
hidden_password: {{password}}
{{/if}}
      `;
    const streamTemplateWithString = `
{{#if (contains ".pcap" file)}}
pcap: true
{{else}}
pcap: false
{{/if}}
      `;

    it('should support when a value is not contained in the array', () => {
      const vars = {
        paths: { value: ['/usr/local/var/log/nginx/access.log'] },
        password: { type: 'password', value: '' },
        tags: { value: ['foo', 'bar', 'forwarded'] },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        paths: ['/usr/local/var/log/nginx/access.log'],
        exclude_files: ['.gz$'],
        processors: [{ add_locale: null }],
        password: '',
        'publisher_pipeline.disable_host': true,
        tags: ['foo', 'bar', 'forwarded'],
      });
    });

    it('should support when a value is contained in the array', () => {
      const vars = {
        paths: { value: ['/usr/local/var/log/nginx/access.log'] },
        password: { type: 'password', value: '' },
        tags: { value: ['foo', 'bar'] },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        paths: ['/usr/local/var/log/nginx/access.log'],
        exclude_files: ['.gz$'],
        processors: [{ add_locale: null }],
        password: '',
        tags: ['foo', 'bar'],
      });
    });

    it('should support strings', () => {
      const vars = {
        file: { value: 'foo.pcap' },
      };

      const output = compileTemplate(vars, streamTemplateWithString);
      expect(output).toEqual({
        pcap: true,
      });
    });

    it('should support strings with no match', () => {
      const vars = {
        file: { value: 'file' },
      };

      const output = compileTemplate(vars, streamTemplateWithString);
      expect(output).toEqual({
        pcap: false,
      });
    });
  });

  describe('escape_string helper', () => {
    const streamTemplate = `
input: log
password: {{escape_string password}}
      `;

    const streamTemplateWithNewlinesAndEscapes = `
input: log
text_var: {{escape_string text_var}}
      `;

    it('should wrap in single quotes and escape any single quotes in the string', () => {
      const vars = {
        password: { type: 'password', value: "ab'c'" },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        password: "ab'c'",
      });
    });

    it('should respect new lines and literal escapes', () => {
      const vars = {
        text_var: {
          type: 'text',
          value: `This is a text with
New lines and \\n escaped values.`,
        },
      };

      const output = compileTemplate(vars, streamTemplateWithNewlinesAndEscapes);
      expect(output).toEqual({
        input: 'log',
        text_var: `This is a text with
New lines and \\n escaped values.`,
      });
    });
  });

  describe('escape_multiline_string helper', () => {
    it('should escape new lines', () => {
      const streamTemplate = `
      input: log
      multiline_text: "{{escape_multiline_string multiline_text}}"
            `;

      const vars = {
        multiline_text: {
          type: 'textarea',
          value: `This is a text with
New lines and \n escaped values.`,
        },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        multiline_text: `This is a text with
New lines and 
escaped values.`,
      });
    });

    it('should escape single quotes', () => {
      const streamTemplate = `
      input: log
      multiline_text: "{{escape_multiline_string multiline_text}}"
            `;

      const vars = {
        multiline_text: {
          type: 'textarea',
          value: `This is a multiline text with
'escaped values.'`,
        },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        multiline_text: `This is a multiline text with
''escaped values.''`,
      });
    });

    it('should allow concatenation of multiline strings', () => {
      const streamTemplate = `
input: log
multiline_text: "{{escape_multiline_string multiline_text}}{{escape_multiline_string "
This is a concatenated text
with new lines"}}"
      `;

      const vars = {
        multiline_text: {
          type: 'textarea',
          value: `This is a text with
New lines and\nescaped values.`,
        },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        multiline_text: `This is a text with
New lines and
escaped values.
This is a concatenated text
with new lines`,
      });
    });
  });

  describe('to_json helper', () => {
    const streamTemplate = `
input: log
json_var: {{to_json json_var}}
      `;

    const streamTemplateWithNewYaml = `
input: log
yaml_var: {{to_json yaml_var}}
      `;

    it('should parse a json string into a json object', () => {
      const vars = {
        json_var: { type: 'text', value: `{"foo":["bar","bazz"]}` },
      };

      const output = compileTemplate(vars, streamTemplate);
      expect(output).toEqual({
        input: 'log',
        json_var: {
          foo: ['bar', 'bazz'],
        },
      });
    });

    it('should parse a yaml string into a json object', () => {
      const vars = {
        yaml_var: {
          type: 'yaml',
          value: `foo:
  bar:
    - a
    - b`,
        },
      };

      const output = compileTemplate(vars, streamTemplateWithNewYaml);
      expect(output).toEqual({
        input: 'log',
        yaml_var: {
          foo: {
            bar: ['a', 'b'],
          },
        },
      });
    });
  });

  it('should support optional yaml values at root level', () => {
    const streamTemplate = `
input: logs
{{custom}}
    `;
    const vars = {
      custom: {
        type: 'yaml',
        value: null,
      },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'logs',
    });
  });

  it('should support $$$$ yaml values at root level', () => {
    const streamTemplate = `
input: logs
{{custom}}
    `;
    const vars = {
      custom: {
        type: 'yaml',
        value: 'test: $$$$',
      },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      input: 'logs',
      test: '$$$$',
    });
  });

  it('should suport !!str for string values', () => {
    const stringTemplate = `
my-package:
    asteriskOnly: {{asteriskOnly}}
    startsWithAsterisk: {{startsWithAsterisk}}
    numeric_with_str: !!str {{numeric}}
    numeric_without_str: {{numeric}}
    mixed: {{mixed}}
    concatenatedEnd: {{a}}{{b}}
    concatenatedMiddle: {{c}}{{d}}
    mixedMultiline: |-
        {{{ search }}} | streamstats`;

    const vars = {
      asteriskOnly: { value: '"*"', type: 'text' },
      startsWithAsterisk: { value: '"*lala"', type: 'text' },
      numeric: { value: '100', type: 'text' },
      mixed: { value: '1s', type: 'text' },
      a: { value: '/opt/package/*', type: 'text' },
      b: { value: '/logs/my.log*', type: 'text' },
      c: { value: '/opt/*/package/', type: 'text' },
      d: { value: 'logs/*my.log', type: 'text' },
      search: { value: 'search sourcetype="access*"', type: 'text' },
    };

    const targetOutput = {
      'my-package': {
        asteriskOnly: '*',
        startsWithAsterisk: '*lala',
        numeric_with_str: '100',
        numeric_without_str: 100,
        mixed: '1s',
        concatenatedEnd: '/opt/package/*/logs/my.log*',
        concatenatedMiddle: '/opt/*/package/logs/*my.log',
        mixedMultiline: 'search sourcetype="access*" | streamstats',
      },
    };

    const output = compileTemplate(vars, stringTemplate);
    expect(output).toEqual(targetOutput);
  });

  it('should throw on invalid handlebar template', () => {
    const streamTemplate = `
input: log
paths:
{{ if test}}
  - {{ test}}
{{ end }}
`;
    const vars = {};

    expect(() => compileTemplate(vars, streamTemplate)).toThrowError(
      'Error while compiling agent template: options.inverse is not a function'
    );
  });

  it('should throw on invalid yaml', () => {
    const template = `
{{#if condition }}\ncondition: {{condition}}\n{{/if}}\n\npaths:\n{{#each paths as |path|}}\n  - {{path}}\n{{/each}}\n\nexclude_files: \n{{#each exclude_files as |exclude_files|}}\n  - {{exclude_files}}\n{{/each}}\n\nmultiline:\n  pattern: \"^\\\\s\"\n  match: after\n\nprocessors:\n- add_locale: ~\n{{#if processors.length}}\n{{processors}}\n{{/if}}\nallow_deprecated_use: true\ntags:\n{{#if preserve_original_event}}\n  - preserve_original_event\n{{/if}}\n{{#each tags as |tag|}}\n  - {{tag}}\n{{/each}}\n\n{{#if ignore_older}}\nignore_older: {{ignore_older}}\n{{/if}}\n
`;
    const vars = {
      processors: {
        type: 'yaml',
        value:
          'data_stream:\n  dataset: test\n\nprocessors:\n  - add_host_metadata: \\~\n  - add_cloud_metadata: \\~',
      },
    };

    expect(() => compileTemplate(vars, template)).toThrowError(
      'YAMLException: duplicated mapping key'
    );
  });
});

describe('encode', () => {
  it('should correctly percent encode a string', () => {
    const streamTemplate = `
    hosts: 
      - sqlserver://{{url_encode username}}:{{url_encode password}}@{{hosts}}`;

    const vars = {
      username: { value: 'db_elastic_agent@?#:', type: 'text' },
      password: { value: 'dbelasticagent[!#@2023', type: 'password' },
      hosts: { value: 'localhost', type: 'text' },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      hosts: ['sqlserver://db_elastic_agent%40%3F%23%3A:dbelasticagent%5B%21%23%402023@localhost'],
    });
  });

  it('should correctly encode parts of the URI of the form domain\\username', () => {
    const streamTemplate = `
    hosts: 
      - sqlserver://{{url_encode username}}:{{url_encode password}}@{{hosts}}`;

    const vars = {
      username: { value: 'domain\\username', type: 'text' },
      password: { value: 'dbelasticagent[!#@2023', type: 'password' },
      hosts: { value: 'localhost', type: 'text' },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      hosts: ['sqlserver://domain%5Cusername:dbelasticagent%5B%21%23%402023@localhost'],
    });
  });

  it('should handle special characters which are not encoded by default', () => {
    const streamTemplate = `
    hosts: 
      - sqlserver://{{url_encode username}}:{{url_encode password}}@{{hosts}}`;

    const vars = {
      username: { value: 'db_elastic_agent', type: 'text' },
      password: { value: "Special Characters: ! * ( )'", type: 'password' },
      hosts: { value: 'localhost', type: 'text' },
    };

    const output = compileTemplate(vars, streamTemplate);
    expect(output).toEqual({
      hosts: [
        'sqlserver://db_elastic_agent:Special%20Characters%3A%20%21%20%2A%20%28%20%29%27@localhost',
      ],
    });
  });
});

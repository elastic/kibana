/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { maxReferencedContentItems } from '@kbn/agent-builder-common';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { loadSkillFromDirectory } from './load_skill_from_directory';
import type { SkillLoadErrorCode } from './skill_load_error';

const BASE_PATH = 'skills/search' as const;

const skillMarkdown = (frontmatterLines: string[], body = 'This is the skill body.'): string =>
  ['---', ...frontmatterLines, '---', '', body].join('\n');

const dirNameFor = (caseLabel: string): string => caseLabel.replace(/[^a-z0-9]+/gi, '-');

describe('loadSkillFromDirectory', () => {
  let rootDir: string;
  let logger: MockedLogger;

  const skillDir = (name: string): string => {
    const dir = join(rootDir, name);
    mkdirSync(dir, { recursive: true });
    return dir;
  };

  const writeFile = (dir: string, relativePath: string, content: string): void => {
    const fullPath = join(dir, relativePath);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
  };

  beforeEach(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'skill-loader-'));
    logger = loggerMock.create();
  });

  afterEach(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  it('loads a minimal skill with no references, defaulting id to name', () => {
    const dir = skillDir('minimal');
    writeFile(
      dir,
      'SKILL.md',
      skillMarkdown(['name: minimal-skill', 'description: A minimal skill.'], 'Body content.')
    );

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill).toEqual({
      id: 'minimal-skill',
      name: 'minimal-skill',
      basePath: BASE_PATH,
      description: 'A minimal skill.',
      experimental: undefined,
      content: 'Body content.',
      referencedContent: undefined,
    });
  });

  it('uses an explicit id from the frontmatter when provided', () => {
    const dir = skillDir('explicit-id');
    writeFile(
      dir,
      'SKILL.md',
      skillMarkdown(['name: my-skill', 'id: stable-id', 'description: desc.'])
    );

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.id).toBe('stable-id');
    expect(skill.name).toBe('my-skill');
  });

  it.each([true, false])(
    'passes through the experimental frontmatter flag (%s)',
    (experimental) => {
      const dir = skillDir(`experimental-${experimental}`);
      writeFile(
        dir,
        'SKILL.md',
        skillMarkdown(['name: my-skill', 'description: desc.', `experimental: ${experimental}`])
      );

      const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

      expect(skill.experimental).toBe(experimental);
    }
  );

  it('derives relativePath from each reference position in the tree', () => {
    const dir = skillDir('nested-mixed');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'overview.md', 'Overview.');
    writeFile(dir, 'details.md', 'Details.');
    writeFile(dir, 'queries/first.md', 'First.');
    writeFile(dir, 'queries/esql/second.md', 'Second.');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'details', relativePath: '.', content: 'Details.' },
      { name: 'overview', relativePath: '.', content: 'Overview.' },
      { name: 'second', relativePath: './queries/esql', content: 'Second.' },
      { name: 'first', relativePath: './queries', content: 'First.' },
    ]);
  });

  it('allows the root-reserved "skill" name in a subdirectory', () => {
    const dir = skillDir('nested-skill-name');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'nested/skill.md', 'Nested content.');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'skill', relativePath: './nested', content: 'Nested content.' },
    ]);
  });

  it('accepts uppercase file names and directory segments', () => {
    const dir = skillDir('mixed-case');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'README.md', 'Readme content.');
    writeFile(dir, 'References/Guide.md', 'Guide content.');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'README', relativePath: '.', content: 'Readme content.' },
      { name: 'Guide', relativePath: './References', content: 'Guide content.' },
    ]);
  });

  it('treats a nested SKILL.md as an ordinary reference', () => {
    const dir = skillDir('nested-skill-file');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'bundled/SKILL.md', 'Bundled content.');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'SKILL', relativePath: './bundled', content: 'Bundled content.' },
    ]);
  });

  const rejectedReferenceCases: Array<{
    label: string;
    filePath: string;
    invalidSegment: string;
  }> = [
    {
      label: 'a space in the file name',
      filePath: 'bad name.md',
      invalidSegment: 'bad name',
    },
    {
      label: 'a dot in the file name',
      filePath: 'config.yaml.md',
      invalidSegment: 'config.yaml',
    },
    {
      label: 'a leading hyphen in the file name',
      filePath: '-overview.md',
      invalidSegment: '-overview',
    },
    {
      label: 'a trailing underscore in the file name',
      filePath: 'overview_.md',
      invalidSegment: 'overview_',
    },
  ];

  it.each(rejectedReferenceCases)(
    'throws for a markdown reference with $label',
    ({ label, filePath, invalidSegment }) => {
      const dir = skillDir(dirNameFor(label));
      writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
      writeFile(dir, filePath, 'Rejected content.');

      expect(() => loadSkillFromDirectory(dir, BASE_PATH, { logger })).toThrow(
        expect.objectContaining({
          name: 'SkillLoadError',
          code: 'invalid_reference_name',
          message: expect.stringContaining(`has an invalid path segment "${invalidSegment}"`),
        })
      );
    }
  );

  it('throws for a markdown reference with an uppercase extension', () => {
    const dir = skillDir('uppercase-extension');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'overview.MD', 'Overview content.');

    expect(() => loadSkillFromDirectory(dir, BASE_PATH, { logger })).toThrow(
      expect.objectContaining({
        name: 'SkillLoadError',
        code: 'invalid_reference_name',
        message: expect.stringContaining('must use a lowercase ".md" extension, but has ".MD"'),
      })
    );
  });

  it('ignores dot-prefixed files and directories', () => {
    const dir = skillDir('dot-prefixed');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, '.github/CODEOWNERS.md', 'ignored');
    writeFile(dir, '.hidden.md', 'ignored');
    writeFile(dir, 'reference.md', 'kept');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'reference', relativePath: '.', content: 'kept' },
    ]);
  });

  it('does not follow symlinks out of the skill directory', () => {
    const outside = skillDir('outside');
    writeFile(outside, 'secret.md', 'Secret content.');
    const dir = skillDir('symlinked');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'reference.md', 'kept');
    symlinkSync(outside, join(dir, 'linked-dir'));
    symlinkSync(join(outside, 'secret.md'), join(dir, 'linked-file.md'));
    symlinkSync(dir, join(dir, 'cycle'));

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'reference', relativePath: '.', content: 'kept' },
    ]);
  });

  it('trims reference content', () => {
    const dir = skillDir('untrimmed-ref');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'overview.md', '\n\n  Overview content.  \n\n');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'overview', relativePath: '.', content: 'Overview content.' },
    ]);
  });

  it('ignores non-markdown files regardless of how they are named', () => {
    const dir = skillDir('mixed-files');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'Notes For Humans.txt', 'ignored');
    writeFile(dir, 'scripts/Run Me.py', 'ignored');
    writeFile(dir, 'reference.md', 'kept');

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toEqual([
      { name: 'reference', relativePath: '.', content: 'kept' },
    ]);
  });

  it('accepts exactly the maximum number of references', () => {
    const dir = skillDir('max-refs');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    for (let index = 0; index < maxReferencedContentItems; index++) {
      writeFile(dir, `ref-${index}.md`, `Content ${index}.`);
    }

    const skill = loadSkillFromDirectory(dir, BASE_PATH, { logger });

    expect(skill.referencedContent).toHaveLength(maxReferencedContentItems);
  });

  it('throws when there are more references than the maximum', () => {
    const dir = skillDir('too-many-refs');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    for (let index = 0; index <= maxReferencedContentItems; index++) {
      writeFile(dir, `ref-${index}.md`, `Content ${index}.`);
    }

    expect(() => loadSkillFromDirectory(dir, BASE_PATH, { logger })).toThrow(
      new RegExp(`at most ${maxReferencedContentItems} are allowed`)
    );
  });

  const invalidSkillCases: Array<{
    label: string;
    fileName: string;
    content: string;
    expectedError: RegExp;
    expectedCode: SkillLoadErrorCode;
  }> = [
    {
      label: 'SKILL.md is missing',
      fileName: 'overview.md',
      content: 'Orphan reference.',
      expectedError: /no SKILL\.md found/,
      expectedCode: 'missing_skill_file',
    },
    {
      label: 'the skill file name differs in case from SKILL.md',
      fileName: 'skill.md',
      content: skillMarkdown(['name: my-skill', 'description: desc.']),
      expectedError: /no SKILL\.md found/,
      expectedCode: 'missing_skill_file',
    },
    {
      label: 'the frontmatter block is missing',
      fileName: 'SKILL.md',
      content: 'Just a body, no frontmatter.',
      expectedError: /must begin with a valid YAML/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the frontmatter block is not valid YAML',
      fileName: 'SKILL.md',
      content: ['---', 'name: : : broken', '  bad indent', '---', '', 'Body.'].join('\n'),
      expectedError: /must begin with a valid YAML.*Nested mappings are not allowed/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the frontmatter block is empty',
      fileName: 'SKILL.md',
      content: ['---', '---', '', 'Body.'].join('\n'),
      expectedError: /invalid frontmatter/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the skill body is empty',
      fileName: 'SKILL.md',
      content: ['---', 'name: my-skill', 'description: desc.', '---', ''].join('\n'),
      expectedError: /Content must be non-empty/,
      expectedCode: 'invalid_definition',
    },
    {
      label: 'the frontmatter is missing name',
      fileName: 'SKILL.md',
      content: skillMarkdown(['description: desc.']),
      expectedError: /invalid frontmatter/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the frontmatter is missing description',
      fileName: 'SKILL.md',
      content: skillMarkdown(['name: my-skill']),
      expectedError: /invalid frontmatter/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'experimental is not a boolean',
      fileName: 'SKILL.md',
      content: skillMarkdown(['name: my-skill', 'description: desc.', 'experimental: maybe']),
      expectedError: /invalid frontmatter/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'an explicit id violates the skill ID format',
      fileName: 'SKILL.md',
      content: skillMarkdown(['name: my-skill', 'id: Not A Valid Id', 'description: desc.']),
      expectedError: /invalid skill ID/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the id defaulted from name violates the skill ID format',
      fileName: 'SKILL.md',
      content: skillMarkdown(['name: -leading-hyphen', 'description: desc.']),
      expectedError: /invalid skill ID/,
      expectedCode: 'invalid_frontmatter',
    },
    {
      label: 'the name violates the schema',
      fileName: 'SKILL.md',
      content: skillMarkdown(['name: Invalid Name', 'id: valid-id', 'description: desc.']),
      expectedError: /invalid skill/,
      expectedCode: 'invalid_definition',
    },
  ];

  it.each(invalidSkillCases)(
    'throws when $label',
    ({ label, fileName, content, expectedError, expectedCode }) => {
      const dir = skillDir(dirNameFor(label));
      writeFile(dir, fileName, content);

      expect(() => loadSkillFromDirectory(dir, BASE_PATH, { logger })).toThrow(
        expect.objectContaining({
          name: 'SkillLoadError',
          code: expectedCode,
          message: expect.stringMatching(expectedError),
        })
      );
    }
  );

  it('throws when a reference file is empty', () => {
    const dir = skillDir('empty-ref');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));
    writeFile(dir, 'overview.md', '   \n  \n');

    expect(() => loadSkillFromDirectory(dir, BASE_PATH, { logger })).toThrow(
      expect.objectContaining({
        name: 'SkillLoadError',
        code: 'empty_reference',
        message: expect.stringMatching(/reference file "overview\.md" is empty/),
      })
    );
  });

  it('throws when the directory does not exist', () => {
    expect(() => loadSkillFromDirectory(join(rootDir, 'nowhere'), BASE_PATH, { logger })).toThrow(
      /no SKILL\.md found/
    );
  });

  it('throws when the path is a file rather than a directory', () => {
    const dir = skillDir('not-a-directory');
    writeFile(dir, 'SKILL.md', skillMarkdown(['name: my-skill', 'description: desc.']));

    expect(() => loadSkillFromDirectory(join(dir, 'SKILL.md'), BASE_PATH, { logger })).toThrow(
      /no SKILL\.md found/
    );
  });
});

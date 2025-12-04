# @kbn/agent-skills-common

Common utilities for agent skills, including a virtual file system abstraction for organizing skills as documents.

## Overview

This package provides:

- **Virtual File System**: Abstract classes for representing skills as documents in a hierarchical file system structure.
- **Skill Classes**: Concrete implementations for defining skills and skill groups.

## Usage

```typescript
import {
  AbstractFile,
  AbstractDirectory,
  RootDirectory,
  Directory,
  Skill,
  SkillGroup,
  skillFactory,
  skillGroupFactory,
} from '@kbn/agent-skills-common';

// Create a skill
const mySkill = skillFactory({
  name: 'My Skill',
  fileName: 'my_skill.skill',
  description: 'A skill that does something',
  content: 'Skill content here',
});

// Create a skill group
const myGroup = skillGroupFactory({
  name: 'my-group',
  description: 'A group of related skills',
  skills: [mySkill],
});

// Build a file system
const root = new RootDirectory('skills', 'Root directory for all skills');
root.addDirectory(myGroup);

// Access skills
const allSkills = root.getAllFiles();
const content = await mySkill.getContent();
```







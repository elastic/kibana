# Agent Skills

A shared server-side plugin for agent skills.

## Overview

This plugin provides agent skills functionality for Kibana.

## Development

### Plugin Structure

```
agent_skills/
├── kibana.jsonc          # Plugin manifest
├── jest.config.js        # Jest test configuration
├── tsconfig.json         # TypeScript configuration
├── tsconfig.type_check.json
├── README.md
└── server/
    ├── index.ts          # Server entry point
    ├── plugin.ts         # Plugin class
    └── types.ts          # Type definitions
```

### Setup & Start

The plugin exposes `setup` and `start` contracts that other plugins can depend on:

- **Setup**: Called during Kibana's setup lifecycle phase
- **Start**: Called during Kibana's start lifecycle phase

## Usage

### Registering Skills

To register a skill from another plugin, add `agentSkills` to your plugin's `requiredPlugins` or `optionalPlugins` in `kibana.jsonc`, then use the `registerSkill` method during setup:

```typescript
import type { CoreSetup } from '@kbn/core/server';
import type { AgentSkillsPluginSetup } from '@kbn/agent-skills-server';
import { Skill } from '@kbn/agent-skills-common';

export class MyPlugin {
  public setup(core: CoreSetup, plugins: { agentSkills: AgentSkillsPluginSetup }) {
    // Create a skill instance (must extend the abstract Skill class)
    class MyCustomSkill extends Skill {
      readonly id = 'my-plugin.my-skill';
      readonly name = 'My Custom Skill';
      readonly shortDescription = 'A custom skill for my plugin';
      readonly content = 'Skill content here...';
      readonly filePath = '/path/to/skill';
    }

    // Register the skill
    plugins.agentSkills.registerSkill(new MyCustomSkill());
  }
}
```

### Consuming Skills

To get all registered skills from another plugin, use the `getSkills` method during start:

```typescript
import type { CoreStart } from '@kbn/core/server';
import type { AgentSkillsPluginStart } from '@kbn/agent-skills-server';

export class MyConsumerPlugin {
  public start(core: CoreStart, plugins: { agentSkills: AgentSkillsPluginStart }) {
    // Get all registered skills
    const skills = plugins.agentSkills.getSkills();
    
    // Use the skills as needed
    skills.forEach((skill) => {
      console.log(`Skill: ${skill.name} (${skill.id})`);
      console.log(`Description: ${skill.shortDescription}`);
      console.log(`Content: ${skill.content}`);
      console.log(`File path: ${skill.filePath}`);
    });
  }
}
```



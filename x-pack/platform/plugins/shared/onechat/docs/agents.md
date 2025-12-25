# Registering Built-in Agents

This document covers how to register platform agents in the Agent Builder framework.

> Also see the main [CONTRIBUTOR_GUIDE.md](../CONTRIBUTOR_GUIDE.md) for general information about built-in tools and agents.

## Registering the agent

```ts
class MyPlugin {
  setup(core: CoreSetup, { onechat }: { onechat: OnechatPluginSetup }) {
    onechat.agents.register(myAgentDefinition);
  }
}
```

## Adding the agent to the allow list

Similar to tools, we keep an hardcoded list of registered agents to trigger a code review from the team when
agents are added.

To add a tool to the allow list, simply add the tool's id to the `AGENT_BUILDER_BUILTIN_AGENTS` array,
in `x-pack/platform/packages/shared/onechat/onechat-server/allow_lists.ts`

(Kibana will fail to start otherwise, with an explicit error message explaining what to do)

## Making sure the agent's namespace is registered as being internal

Platform agents should all be namespaced under protected namespaces, to avoid id collisions with user-created agents.
When introducing a new protected namespace (e.g. when adding a new category of agents), it must be added
to the `protectedNamespaces` array in `x-pack/platform/packages/shared/onechat/onechat-common/base/namespaces.ts`

## Basic example

How registering a basic agent looks like:

```ts
onechat.agents.register({
  id: 'platform.core.dashboard',
  name: 'Dashboard agent',
  description: 'Agent specialized in dashboard related tasks',
  avatar_icon: 'dashboardApp',
  configuration: {
    instructions: 'You are a dashboard specialist [...]',
    tools: [
      {
        tool_ids: [
          'platform.dashboard.create_dashboard',
          'platform.dashboard.edit_dashboard',
          '[...]',
        ],
      },
    ],
  },
});
```

## Specific research and answer instructions

It is possible to specify specific research and answer instructions for an agent, to avoid
mixing instructions, which can sometimes be confusing for the agent. It also allows to specify
different instructions for each step of the agent's flow.

```ts
onechat.agents.register({
  id: 'platform.core.dashboard',
  name: 'Dashboard agent',
  description: 'Agent specialized in dashboard related tasks',
  avatar_icon: 'dashboardApp',
  configuration: {
    research: {
      instructions: 'You are a dashboard builder specialist assistant. Always uses the XXX tool when the user wants to YYY...'
    },
    answer: {
      instructions: 'When answering, if a dashboard configuration is present in the results, always render it using [...]',
    },
    tools: [
      {
        tool_ids: [someListOfToolIds],
      },
    ],
  },
});
```

Refer to [`AgentConfiguration`](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/shared/onechat/onechat-common/agents/definition.ts)
for the full list of available configuration options.


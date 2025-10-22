/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

class AgentBuilderDocLinks {
  public agentBuilder: string = '';
  public getStarted: string = '';
  public models: string = '';
  public chat: string = '';
  public agentBuilderAgents: string = '';
  public tools: string = '';
  public programmaticAccess: string = '';
  public kibanaApi: string = '';
  public mcpServer: string = '';
  public a2aServer: string = '';
  public limitationsKnownIssues: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.agentBuilder = newDocLinks.agentBuilder.agentBuilder;
    this.getStarted = newDocLinks.agentBuilder.getStarted;
    this.models = newDocLinks.agentBuilder.models;
    this.chat = newDocLinks.agentBuilder.chat;
    this.agentBuilderAgents = newDocLinks.agentBuilder.agentBuilderAgents;
    this.tools = newDocLinks.agentBuilder.tools;
    this.programmaticAccess = newDocLinks.agentBuilder.programmaticAccess;
    this.kibanaApi = newDocLinks.agentBuilder.kibanaApi;
    this.mcpServer = newDocLinks.agentBuilder.mcpServer;
    this.a2aServer = newDocLinks.agentBuilder.a2aServer;
    this.limitationsKnownIssues = newDocLinks.agentBuilder.limitationsKnownIssues;
  }
}

export const docLinks = new AgentBuilderDocLinks();

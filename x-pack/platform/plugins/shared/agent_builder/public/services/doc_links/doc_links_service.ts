/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

export class DocLinksService {
  public readonly agentBuilder: string;
  public readonly getStarted: string;
  public readonly models: string;
  public readonly chat: string;
  public readonly agentBuilderAgents: string;
  public readonly agentBuilderSkills: string;
  public readonly agentBuilderPlugins: string;
  public readonly agentBuilderConnectors: string;
  public readonly agentBuilderTools: string;
  public readonly programmaticAccess: string;
  public readonly kibanaApi: string;
  public readonly mcpServer: string;
  public readonly a2aServer: string;
  public readonly limitationsKnownIssues: string;
  public readonly limitationsKnownIssuesConversationLengthExceeded: string;

  constructor(docLinks: DocLinks) {
    this.agentBuilder = docLinks.agentBuilder.agentBuilder;
    this.getStarted = docLinks.agentBuilder.getStarted;
    this.models = docLinks.agentBuilder.models;
    this.chat = docLinks.agentBuilder.chat;
    this.agentBuilderAgents = docLinks.agentBuilder.agentBuilderAgents;
    this.agentBuilderSkills = docLinks.agentBuilder.agentBuilderSkills;
    this.agentBuilderPlugins = docLinks.agentBuilder.agentBuilderPlugins;
    this.agentBuilderConnectors = docLinks.agentBuilder.agentBuilderConnectors;
    this.agentBuilderTools = docLinks.agentBuilder.agentBuilderTools;
    this.programmaticAccess = docLinks.agentBuilder.programmaticAccess;
    this.kibanaApi = docLinks.agentBuilder.kibanaApi;
    this.mcpServer = docLinks.agentBuilder.mcpServer;
    this.a2aServer = docLinks.agentBuilder.a2aServer;
    this.limitationsKnownIssues = docLinks.agentBuilder.limitationsKnownIssues;
    this.limitationsKnownIssuesConversationLengthExceeded = `${docLinks.agentBuilder.limitationsKnownIssues}#conversation-length-exceeded`;
  }
}

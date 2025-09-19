/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinks } from '@kbn/doc-links';

class OnechatDocLinks {
  public agentBuilder: string = '';
  public getStarted: string = '';
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
    this.agentBuilder = newDocLinks.onechat.agentBuilder;
    this.getStarted = newDocLinks.onechat.getStarted;
    this.chat = newDocLinks.onechat.chat;
    this.agentBuilderAgents = newDocLinks.onechat.agentBuilderAgents;
    this.tools = newDocLinks.onechat.tools;
    this.programmaticAccess = newDocLinks.onechat.programmaticAccess;
    this.kibanaApi = newDocLinks.onechat.kibanaApi;
    this.mcpServer = newDocLinks.onechat.mcpServer;
    this.a2aServer = newDocLinks.onechat.a2aServer;
    this.limitationsKnownIssues = newDocLinks.onechat.limitationsKnownIssues;
  }
}

export const docLinks = new OnechatDocLinks();

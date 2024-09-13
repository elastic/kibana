/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { SecurityPageName } from '@kbn/security-solution-navigation';
import type {
  SectionUpsellings,
  PageUpsellings,
  UpsellingSectionId,
  UpsellingMessageId,
  MessageUpsellings,
} from './types';

export class UpsellingService {
  private sections: Map<UpsellingSectionId, React.ComponentType>;
  private pages: Map<SecurityPageName, React.ComponentType>;
  private messages: Map<UpsellingMessageId, string>;

  private messagesSubject$: BehaviorSubject<Map<UpsellingMessageId, string>>;
  private sectionsSubject$: BehaviorSubject<Map<UpsellingSectionId, React.ComponentType>>;
  private pagesSubject$: BehaviorSubject<Map<SecurityPageName, React.ComponentType>>;

  public sections$: Observable<Map<UpsellingSectionId, React.ComponentType>>;
  public pages$: Observable<Map<SecurityPageName, React.ComponentType>>;
  public messages$: Observable<Map<UpsellingMessageId, string>>;

  constructor() {
    this.sections = new Map();
    this.sectionsSubject$ = new BehaviorSubject(new Map());
    this.sections$ = this.sectionsSubject$.asObservable();

    this.pages = new Map();
    this.pagesSubject$ = new BehaviorSubject(new Map());
    this.pages$ = this.pagesSubject$.asObservable();

    this.messages = new Map();
    this.messagesSubject$ = new BehaviorSubject(new Map());
    this.messages$ = this.messagesSubject$.asObservable();
  }

  setSections(sections: SectionUpsellings) {
    this.sections.clear();

    Object.entries(sections).forEach(([sectionId, component]) => {
      this.sections.set(sectionId as UpsellingSectionId, component);
    });

    this.sectionsSubject$.next(this.sections);
  }

  setPages(pages: PageUpsellings) {
    this.pages.clear();

    Object.entries(pages).forEach(([pageId, component]) => {
      this.pages.set(pageId as SecurityPageName, component);
    });

    this.pagesSubject$.next(this.pages);
  }

  setMessages(messages: MessageUpsellings) {
    this.messages.clear();

    Object.entries(messages).forEach(([messageId, component]) => {
      this.messages.set(messageId as UpsellingMessageId, component);
    });

    this.messagesSubject$.next(this.messages);
  }

  isPageUpsellable(id: SecurityPageName) {
    return this.pages.has(id);
  }

  getPageUpselling(id: SecurityPageName) {
    return this.pages.get(id);
  }

  getSectionsValue() {
    return this.sectionsSubject$.getValue();
  }

  getMessagesValue() {
    return this.messagesSubject$.getValue();
  }
}

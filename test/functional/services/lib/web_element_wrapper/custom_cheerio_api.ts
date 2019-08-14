/* eslint-disable */

/**
 * Type interfaces extracted from node_modules/@types/cheerio/index.d.ts
 * and customized to include our custom methods
 */

interface CheerioSelector {
  (selector: string): CustomCheerio;
  (selector: string, context: string): CustomCheerio;
  (selector: string, context: CheerioElement): CustomCheerio;
  (selector: string, context: CheerioElement[]): CustomCheerio;
  (selector: string, context: Cheerio): CustomCheerio;
  (selector: string, context: string, root: string): CustomCheerio;
  (selector: string, context: CheerioElement, root: string): CustomCheerio;
  (selector: string, context: CheerioElement[], root: string): CustomCheerio;
  (selector: string, context: Cheerio, root: string): CustomCheerio;
  (selector: any): CustomCheerio;
}

export interface CustomCheerioStatic extends CheerioSelector {
  // Document References
  // Cheerio https://github.com/cheeriojs/cheerio
  // JQuery http://api.jquery.com
  xml(): string;
  root(): CustomCheerio;
  contains(container: CheerioElement, contained: CheerioElement): boolean;
  parseHTML(data: string, context?: Document, keepScripts?: boolean): Document[];

  html(options?: CheerioOptionsInterface): string;
  html(selector: string, options?: CheerioOptionsInterface): string;
  html(element: CustomCheerio, options?: CheerioOptionsInterface): string;
  html(element: CheerioElement, options?: CheerioOptionsInterface): string;

  //
  // CUSTOM METHODS
  //
  findTestSubjects(selector: string): CustomCheerio;
  findTestSubject(selector: string): CustomCheerio;
}

export interface CustomCheerio {
  // Document References
  // Cheerio https://github.com/cheeriojs/cheerio
  // JQuery http://api.jquery.com

  [index: number]: CheerioElement;
  length: number;

  // Attributes

  attr(): { [attr: string]: string };
  attr(name: string): string;
  attr(name: string, value: any): CustomCheerio;

  data(): any;
  data(name: string): any;
  data(name: string, value: any): any;

  val(): string;
  val(value: string): CustomCheerio;

  removeAttr(name: string): CustomCheerio;

  has(selector: string): CustomCheerio;
  has(element: CheerioElement): CustomCheerio;

  hasClass(className: string): boolean;
  addClass(classNames: string): CustomCheerio;

  removeClass(): CustomCheerio;
  removeClass(className: string): CustomCheerio;
  removeClass(func: (index: number, className: string) => string): CustomCheerio;

  toggleClass(className: string): CustomCheerio;
  toggleClass(className: string, toggleSwitch: boolean): CustomCheerio;
  toggleClass(toggleSwitch?: boolean): CustomCheerio;
  toggleClass(
    func: (index: number, className: string, toggleSwitch: boolean) => string,
    toggleSwitch?: boolean
  ): CustomCheerio;

  is(selector: string): boolean;
  is(element: CheerioElement): boolean;
  is(element: CheerioElement[]): boolean;
  is(selection: CustomCheerio): boolean;
  is(func: (index: number, element: CheerioElement) => boolean): boolean;

  // Form
  serialize(): string;
  serializeArray(): Array<{ name: string; value: string }>;

  // Traversing

  find(selector: string): CustomCheerio;
  find(element: CustomCheerio): CustomCheerio;

  parent(selector?: string): CustomCheerio;
  parents(selector?: string): CustomCheerio;
  parentsUntil(selector?: string, filter?: string): CustomCheerio;
  parentsUntil(element: CheerioElement, filter?: string): CustomCheerio;
  parentsUntil(element: CustomCheerio, filter?: string): CustomCheerio;

  prop(name: string): any;
  prop(name: string, value: any): CustomCheerio;

  closest(): CustomCheerio;
  closest(selector: string): CustomCheerio;

  next(selector?: string): CustomCheerio;
  nextAll(): CustomCheerio;
  nextAll(selector: string): CustomCheerio;

  nextUntil(selector?: string, filter?: string): CustomCheerio;
  nextUntil(element: CheerioElement, filter?: string): CustomCheerio;
  nextUntil(element: CustomCheerio, filter?: string): CustomCheerio;

  prev(selector?: string): CustomCheerio;
  prevAll(): CustomCheerio;
  prevAll(selector: string): CustomCheerio;

  prevUntil(selector?: string, filter?: string): CustomCheerio;
  prevUntil(element: CheerioElement, filter?: string): CustomCheerio;
  prevUntil(element: CustomCheerio, filter?: string): CustomCheerio;

  slice(start: number, end?: number): CustomCheerio;

  siblings(selector?: string): CustomCheerio;

  children(selector?: string): CustomCheerio;

  contents(): CustomCheerio;

  each(func: (index: number, element: CheerioElement) => any): CustomCheerio;
  map(func: (index: number, element: CheerioElement) => any): CustomCheerio;

  filter(selector: string): CustomCheerio;
  filter(selection: CustomCheerio): CustomCheerio;
  filter(element: CheerioElement): CustomCheerio;
  filter(elements: CheerioElement[]): CustomCheerio;
  filter(func: (index: number, element: CheerioElement) => boolean): CustomCheerio;

  not(selector: string): CustomCheerio;
  not(selection: CustomCheerio): CustomCheerio;
  not(element: CheerioElement): CustomCheerio;
  not(func: (index: number, element: CheerioElement) => boolean): CustomCheerio;

  first(): CustomCheerio;
  last(): CustomCheerio;

  eq(index: number): CustomCheerio;

  get(): any[];
  get(index: number): any;

  index(): number;
  index(selector: string): number;
  index(selection: CustomCheerio): number;

  end(): CustomCheerio;

  add(selectorOrHtml: string): CustomCheerio;
  add(selector: string, context: Document): CustomCheerio;
  add(element: CheerioElement): CustomCheerio;
  add(elements: CheerioElement[]): CustomCheerio;
  add(selection: CustomCheerio): CustomCheerio;

  addBack(): CustomCheerio;
  addBack(filter: string): CustomCheerio;

  // Manipulation
  appendTo(target: CustomCheerio): CustomCheerio;
  prependTo(target: CustomCheerio): CustomCheerio;

  append(content: string, ...contents: any[]): CustomCheerio;
  append(content: Document, ...contents: any[]): CustomCheerio;
  append(content: Document[], ...contents: any[]): CustomCheerio;
  append(content: CustomCheerio, ...contents: any[]): CustomCheerio;

  prepend(content: string, ...contents: any[]): CustomCheerio;
  prepend(content: Document, ...contents: any[]): CustomCheerio;
  prepend(content: Document[], ...contents: any[]): CustomCheerio;
  prepend(content: CustomCheerio, ...contents: any[]): CustomCheerio;

  after(content: string, ...contents: any[]): CustomCheerio;
  after(content: Document, ...contents: any[]): CustomCheerio;
  after(content: Document[], ...contents: any[]): CustomCheerio;
  after(content: CustomCheerio, ...contents: any[]): CustomCheerio;

  insertAfter(content: string): CustomCheerio;
  insertAfter(content: Document): CustomCheerio;
  insertAfter(content: CustomCheerio): CustomCheerio;

  before(content: string, ...contents: any[]): CustomCheerio;
  before(content: Document, ...contents: any[]): CustomCheerio;
  before(content: Document[], ...contents: any[]): CustomCheerio;
  before(content: CustomCheerio, ...contents: any[]): CustomCheerio;

  insertBefore(content: string): CustomCheerio;
  insertBefore(content: Document): CustomCheerio;
  insertBefore(content: CustomCheerio): CustomCheerio;

  remove(selector?: string): CustomCheerio;

  replaceWith(content: string): CustomCheerio;
  replaceWith(content: CheerioElement): CustomCheerio;
  replaceWith(content: CheerioElement[]): CustomCheerio;
  replaceWith(content: CustomCheerio): CustomCheerio;
  replaceWith(content: () => CustomCheerio): CustomCheerio;

  empty(): CustomCheerio;

  html(): string | null;
  html(html: string): CustomCheerio;

  text(): string;
  text(text: string): CustomCheerio;

  wrap(content: string): CustomCheerio;
  wrap(content: Document): CustomCheerio;
  wrap(content: CustomCheerio): CustomCheerio;

  css(propertyName: string): string;
  css(propertyNames: string[]): string[];
  css(propertyName: string, value: string): CustomCheerio;
  css(propertyName: string, value: number): CustomCheerio;
  css(propertyName: string, func: (index: number, value: string) => string): CustomCheerio;
  css(propertyName: string, func: (index: number, value: string) => number): CustomCheerio;
  css(properties: Record<string, any>): CustomCheerio;

  // Rendering

  // Miscellaneous

  clone(): CustomCheerio;

  // Not Documented

  toArray(): CheerioElement[];

  //
  // CUSTOM METHODS
  //
  findTestSubjects(selector: string): CustomCheerio;
  findTestSubject(selector: string): CustomCheerio;
}

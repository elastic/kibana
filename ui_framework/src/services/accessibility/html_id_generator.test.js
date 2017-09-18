import { htmlIdGenerator } from './html_id_generator';

describe('htmlIdGenerator', () => {

  it('should return a function', () => {
    const fn = htmlIdGenerator();
    expect(typeof fn).toBe('function');
  });

  it('should return an id ending with the specified suffix', () => {
    expect(htmlIdGenerator()('suf')).toMatch(/suf$/);
  });

  it('should return an id beginning with the specified prefix', () => {
    expect(htmlIdGenerator('pref')('foo')).toMatch(/^pref/);
  });

  it('should create the same id for the same suffix', () => {
    const idGenerator = htmlIdGenerator();
    expect(idGenerator('foo')).toBe(idGenerator('foo'));
  });

  it('should create different ids for different suffixes', () => {
    const idGenerator = htmlIdGenerator();
    expect(idGenerator('foo')).not.toBe(idGenerator('bar'));
  });

  it('should generate different ids on different instances', () => {
    const idGenerator1 = htmlIdGenerator();
    const idGenerator2 = htmlIdGenerator();
    expect(idGenerator1('foo')).not.toBe(idGenerator2('foo'));
  });

  it('should generate different ids if no suffix is passed', () => {
    const generator = htmlIdGenerator();
    expect(generator()).not.toBe(generator());
  });

});

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('cookie handling', () => {
    it('allows non-strict cookies', () => (
      supertest.get('/')
        .set('cookie', 'test:80=value;test_80=value')
        .then((response) => {
          expect(response.text).not.to.contain('Invalid cookie header');
        })
    ));

    it(`returns an error if the cookie can't be parsed`, () => (
      supertest.get('/')
        .set('cookie', 'a')
        .expect(400)
        .then((response) => {
          expect(response.text).to.contain('Invalid cookie header');
        })
    ));
  });
}

import expect from 'expect.js';

export async function getIndexNotFoundError(es) {
  try {
    await es.indices.get({
      index: 'SHOULD NOT EXIST'
    });
  } catch (err) {
    expect(err).to.have.property('status', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.indices.get() call to fail');
}

export async function getDocNotFoundError(es) {
  try {
    await es.get({
      index: 'basic_index',
      type: 'type',
      id: '1234'
    });
  } catch (err) {
    expect(err).to.have.property('status', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.get() call to fail');
}

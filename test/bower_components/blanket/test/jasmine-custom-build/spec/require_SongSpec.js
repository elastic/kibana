define(["source/Song"],function(){
describe("Song", function() {
  var song;

  beforeEach(function() {
    song = new Song();
  });

  it("should be not implemented", function() {
    expect(function() {
      song.persistFavoriteStatus();
    }).toThrow("not yet implemented");
  });
});
});
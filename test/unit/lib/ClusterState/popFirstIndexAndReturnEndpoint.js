define(function (require) {
  'use strict';
  var popFirstIndexAndReturnEndpoint = require('lib/ClusterState/popFirstIndexAndReturnEndpoint');  

  describe('lib/ClusterState', function () {
    
    describe('#popFirstIndexAndReturnEndpoint()', function () {
      beforeEach(function () {
        this.indices = ['one', 'two'];
      });

      it('should return the first index', function () {
        expect(popFirstIndexAndReturnEndpoint(this.indices))
          .to.equal('/one/cluster_state/_search');
      });

      it('should return the next index', function () {
        expect(popFirstIndexAndReturnEndpoint(this.indices))
          .to.equal('/one/cluster_state/_search');
        expect(popFirstIndexAndReturnEndpoint(this.indices))
          .to.equal('/two/cluster_state/_search');
      });

    });

  });

});


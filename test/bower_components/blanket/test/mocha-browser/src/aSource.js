window.anObject = {
	aFunction: function() {
		return 'Hello Blanket';
	},
	factorial: function(n) {
		if(n === 0 || n === 1) {
			return 1;
		} else {
			return n * anObject.factorial(n - 1);
		}
	}
};
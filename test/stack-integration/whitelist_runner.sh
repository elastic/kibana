#!/bin/bash


function ctrl_c {
  echo "reverting changes"
  mv ${APP_INDEX}.tmp ${APP_INDEX}
  mv test/functional/index.js.tmp test/functional/index.js
  exit
}


# accept the fully qualified filename, or just the full filename with extension, or just the filename itself
TEST=${1%.js}

TEST=${TEST##*/}


if find ./test/functional -name ${TEST}.js | grep $1; then
  # if its darwin then apps is at 6 instead of 5
  # find the suite that the test you want is in
  if [ `uname -s` = Darwin ]; then
    APP=`find ./test/functional/ -name ${TEST}.js | cut -d"/" -f 6`
    EXTENSION="''"
  else
    APP=`find ./test/functional/ -name ${TEST}.js | cut -d"/" -f 5`
    EXTENSION=
  fi
  #echo "APP = $APP"

  # backup test/functional/index.js
  cp test/functional/index.js test/functional/index.js.tmp

  # comment out all the apps
  # sed -i $EXTENSION "s|\(\s*\)'intern/dojo/node\!\./apps/|\1//'intern/dojo/node!./apps/|" test/functional/index.js
  sed -i $EXTENSION "s|\(.*'intern/dojo/node\!\./apps/\)|//\1|" test/functional/index.js

  # uncomment just the desired app
  sed -i $EXTENSION "s|//\(.*'intern/dojo/node\!\./apps/${APP}\)|\1|" test/functional/index.js



  APP_INDEX=`grep -rl "require('\./$TEST');" ./test/functional/*`

  # backup the app index file
  cp ${APP_INDEX} ${APP_INDEX}.tmp

  # comment out all suites in this app index
  sed -i $EXTENSION "s|\(require('\./.*');\)|//\1|" ${APP_INDEX}

  # uncomment the requested suite
  sed -i $EXTENSION "s|//\(require('\./${TEST}');\)|\1|" ${APP_INDEX}



  # trap ctrl-c and call ctrl_c()
  trap ctrl_c INT


  # Run the tests
  npm run test:ui:runner

  # reset everything back
  ctrl_c

else
  echo "test $1 not found"
  find ./test/functional -type f
fi

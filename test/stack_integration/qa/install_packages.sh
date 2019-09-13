if [ -z "$PRODUCTS" ]; then . ./envvars.sh; fi
pushd ../downloads

for PRODUCT in $PRODUCTS; do (
  case $PACKAGE in
    deb)
      echo -e "\n\nInstalling ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.deb\n"
      dpkg -i ./${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.deb || exit 1
      ;;
    rpm)
      case $VMOS in
        centos)
          echo -e "\n\nInstalling ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm\n"
          yum install -y ./${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm || exit 1
          ;;
        suse)
          echo -e "\n\nInstalling ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm"
          zypper install -y ./${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm || exit 1
          ;;
        sles)
          echo -e "\n\nInstalling ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm"
          rpm -i ./${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.rpm || exit 1
          ;;
      esac
      ;;
    tar.gz)
      echo "Untar ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}"
      tar -xf ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.tar.gz --directory $INSTALL_DIR
      mv $INSTALL_DIR/${PRODUCT}-${VERSION}* $INSTALL_DIR/${PRODUCT}
      chown -R vagrant:vagrant $INSTALL_DIR/${PRODUCT}
      ;;
    zip)
      echo "Unzip ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}"
      set -x
      # unzip and rename elasticsearch-5.2.0-SNAPSHOT to elasticsearch, etc
      unzip -q ${PRODUCT}${OSS}-${VERSION}${SNAPSHOT}*.zip -d $INSTALL_DIR
      sleep 5
      mv $INSTALL_DIR/${PRODUCT}-${VERSION}* $INSTALL_DIR/${PRODUCT}
      ;;
  esac
); done
popd
# SUSE   zypper install rpm
